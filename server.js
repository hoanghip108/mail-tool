const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const { generateEmailHTML, generateEmailText } = require("./email-template");

const app = express();
const PORT = process.env.PORT || 3000;

// ============= JOB MANAGEMENT SYSTEM =============

// In-memory job storage (in production, use Redis/DB)
const jobs = new Map();

// Job statuses
const JOB_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Create job
function createJob(filename, totalEmails) {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job = {
        id: jobId,
        filename: filename,
        status: JOB_STATUS.PENDING,
        progress: {
            total: totalEmails,
            sent: 0,
            failed: 0,
            current: 0,
            percentage: 0
        },
        results: [],
        failedEmails: [],
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        error: null
    };
    jobs.set(jobId, job);
    console.log(`[JOB] Created job ${jobId} for ${totalEmails} emails`);
    return job;
}

// Update job progress
function updateJobProgress(jobId, update) {
    const job = jobs.get(jobId);
    if (!job) return;
    
    Object.assign(job.progress, update);
    job.progress.percentage = Math.round((job.progress.current / job.progress.total) * 100);
    
    console.log(`[JOB] ${jobId} - Progress: ${job.progress.current}/${job.progress.total} (${job.progress.percentage}%) - Success: ${job.progress.sent}, Failed: ${job.progress.failed}`);
}

// Get job status
function getJob(jobId) {
    return jobs.get(jobId);
}

// Concurrent email sending with batching
async function sendEmailsBatch(transporter, config, emailGroups, jobId) {
    const CONCURRENT_LIMIT = 10; // Send 10 emails at a time
    const BATCH_DELAY = 2000; // 2 seconds between batches
    
    const job = jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    
    job.status = JOB_STATUS.IN_PROGRESS;
    job.startedAt = new Date().toISOString();
    
    const entries = Object.entries(emailGroups);
    const totalEmails = entries.length;
    
    console.log(`[JOB] ${jobId} - Starting batch sending: ${totalEmails} emails, ${CONCURRENT_LIMIT} concurrent`);
    
    for (let i = 0; i < entries.length; i += CONCURRENT_LIMIT) {
        const batch = entries.slice(i, i + CONCURRENT_LIMIT);
        const batchNumber = Math.floor(i / CONCURRENT_LIMIT) + 1;
        const totalBatches = Math.ceil(entries.length / CONCURRENT_LIMIT);
        
        console.log(`[JOB] ${jobId} - Batch ${batchNumber}/${totalBatches} - Sending ${batch.length} emails...`);
        
        // Send batch in parallel
        const promises = batch.map(async ([email, customerData]) => {
            try {
                const result = await sendEmail(transporter, config, customerData);
                
                if (result.success) {
                    job.progress.sent++;
                    job.results.push({
                        email: email,
                        status: 'success',
                        orderCount: customerData.orders.length,
                        messageId: result.messageId
                    });
                } else {
                    job.progress.failed++;
                    job.results.push({
                        email: email,
                        status: 'failed',
                        error: result.error,
                        orderCount: customerData.orders.length
                    });
                    job.failedEmails.push({
                        email: customerData.email,
                        name: customerData.name,
                        phone: customerData.phone,
                        error: result.error,
                        orders: customerData.orders
                    });
                }
                
                job.progress.current++;
                updateJobProgress(jobId, {});
                
                return result;
            } catch (error) {
                console.error(`[JOB] ${jobId} - Error sending to ${email}:`, error.message);
                job.progress.failed++;
                job.progress.current++;
                updateJobProgress(jobId, {});
                return { success: false, error: error.message };
            }
        });
        
        await Promise.all(promises);
        
        // Delay between batches (except last batch)
        if (i + CONCURRENT_LIMIT < entries.length) {
            console.log(`[JOB] ${jobId} - Waiting ${BATCH_DELAY}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }
    
    job.status = JOB_STATUS.COMPLETED;
    job.completedAt = new Date().toISOString();
    
    const duration = new Date(job.completedAt) - new Date(job.startedAt);
    const durationMin = Math.floor(duration / 60000);
    const durationSec = Math.floor((duration % 60000) / 1000);
    
    console.log(`[JOB] ${jobId} - COMPLETED in ${durationMin}m ${durationSec}s - Success: ${job.progress.sent}, Failed: ${job.progress.failed}`);
    
    return job;
}

// Request logger middleware - MUST BE EARLY
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// CORS Middleware - Must be first!
app.use((req, res, next) => {
    // Get origin from request
    const origin = req.headers.origin;

    // List of allowed origins (empty array = allow all)
    const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "https://phuphiem-api.site",
        "http://phuphiem-api.site",
        // Add more domains if needed
    ];

    // Allow all origins or check whitelist
    if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        !origin
    ) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
    } else {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Allow methods
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
    );

    // Allow headers
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, " +
            "ngrok-skip-browser-warning, X-CSRF-Token, Accept-Version, " +
            "Content-Length, Content-MD5, Date, X-Api-Version, Cache-Control"
    );

    // Expose headers
    res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Type, Content-Disposition"
    );

    // Allow credentials
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Cache preflight for 24 hours
    res.setHeader("Access-Control-Max-Age", "86400");

    // Additional security headers for HTTPS
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
        res.setHeader(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        );
    }

    // Handle preflight
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Swagger UI
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Email API Documentation",
        swaggerOptions: {
            persistAuthorization: true,
            requestInterceptor: (req) => {
                // Add ngrok header to bypass warning page
                req.headers["ngrok-skip-browser-warning"] = "true";
                return req;
            },
        },
    })
);

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Chỉ chấp nhận file .xlsx
        if (
            file.mimetype ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.originalname.endsWith(".xlsx")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Chỉ chấp nhận file .xlsx"));
        }
    },
});

// Load environment variables
function loadEnv() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) {
        return null;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    const envVars = {};

    envContent.split("\n").forEach((line) => {
        line = line.trim();
        if (line && !line.startsWith("#")) {
            const [key, ...valueParts] = line.split("=");
            const value = valueParts.join("=").trim();
            envVars[key.trim()] = value;
        }
    });

    return envVars;
}

// Đọc và nhóm dữ liệu từ Excel
function readAndGroupOrders(filePath) {
    try {
        // Debug logging
        console.log("[readAndGroupOrders] Reading file:", filePath);

        // Check if path exists and is a file
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            throw new Error(`Path is a directory, not a file: ${filePath}`);
        }

        console.log("[readAndGroupOrders] File size:", stats.size, "bytes");

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        console.log("[readAndGroupOrders] Sheet name:", sheetName);

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log("[readAndGroupOrders] Total rows:", data.length);

        // Nhóm theo email
        const emailGroups = {};

        data.forEach((row) => {
            // Support multiple email column variants (prioritize "Email Address")
            const email = row["Email Address"] || row["Email"] || row["Email "] || row["email"];
            const phone = row["Số điện thoại"];
            const name = row["Tên người nhận"];

            if (email && phone) {
                const normalizedEmail = String(email).trim().toLowerCase();

                if (!emailGroups[normalizedEmail]) {
                    emailGroups[normalizedEmail] = {
                        email: normalizedEmail,
                        phone: String(phone).trim(),
                        name: name || "Khách hàng",
                        orders: [],
                    };
                }

                emailGroups[normalizedEmail].orders.push(row);
            }
        });

        console.log(
            "[readAndGroupOrders] Email groups:",
            Object.keys(emailGroups).length
        );
        return emailGroups;
    } catch (error) {
        console.error("[readAndGroupOrders] Error:", error.message);
        console.error("[readAndGroupOrders] Stack:", error.stack);
        throw error;
    }
}

// Tạo transporter
function createTransporter(config) {
    return nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT),
        secure: config.SMTP_SECURE === "true",
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
        },
    });
}

// Gửi email
async function sendEmail(transporter, config, customerData) {
    const { email, name, phone, orders } = customerData;

    try {
        const mailOptions = {
            from: `"${config.FROM_NAME}" <${config.FROM_EMAIL}>`,
            to: email,
            subject: config.EMAIL_SUBJECT || "Xác nhận đơn hàng của bạn",
            text: generateEmailText({ name, phone, email }, orders),
            html: generateEmailHTML({ name, phone, email }, orders),
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============= API ENDPOINTS =============

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Kiểm tra server có đang hoạt động không
 *     responses:
 *       200:
 *         description: Server đang hoạt động
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Email API Server is running
 *                 endpoints:
 *                   type: object
 */
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        message: "Email API Server is running",
        version: "2.0.0",
        features: [
            "✅ Concurrent batch sending (10 emails at once)",
            "✅ Background jobs (no timeout)",
            "✅ Realtime progress tracking",
            "✅ 3x faster than v1"
        ],
        endpoints: {
            swagger: "GET /api-docs",
            upload: "POST /api/upload",
            preview: "GET /api/preview/:filename",
            sendEmailsAsync: "POST /api/send-emails-async/:filename (RECOMMENDED)",
            sendEmailsSync: "POST /api/send-emails/:filename",
            jobStatus: "GET /api/job-status/:jobId",
            listJobs: "GET /api/jobs",
            listFiles: "GET /api/files",
        },
        documentation: {
            swagger: `http://localhost:${PORT}/api-docs`,
            quickStart: "See QUICK_START_ASYNC.md",
            fullDocs: "See ASYNC_JOBS.md"
        }
    });
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Files]
 *     summary: Upload file Excel
 *     description: Upload file .xlsx chứa dữ liệu đơn hàng
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File Excel (.xlsx)
 *     responses:
 *       200:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Upload file thành công
 *                 file:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                       example: 1234567890-test.xlsx
 *                     originalName:
 *                       type: string
 *                       example: test.xlsx
 *                     size:
 *                       type: number
 *                       example: 12345
 *                     path:
 *                       type: string
 *                 preview:
 *                   type: object
 *                   properties:
 *                     totalEmails:
 *                       type: number
 *                       example: 428
 *                     totalOrders:
 *                       type: number
 *                       example: 493
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 *       500:
 *         description: Lỗi server
 */
app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Không có file nào được upload",
            });
        }

        // Đọc file để lấy thông tin preview
        const filePath = req.file.path;
        const emailGroups = readAndGroupOrders(filePath);
        const totalEmails = Object.keys(emailGroups).length;
        const totalOrders = Object.values(emailGroups).reduce(
            (sum, group) => sum + group.orders.length,
            0
        );

        res.json({
            success: true,
            message: "Upload file thành công",
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                path: req.file.path,
            },
            preview: {
                totalEmails: totalEmails,
                totalOrders: totalOrders,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi xử lý file",
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/preview/{filename}:
 *   get:
 *     tags: [Files]
 *     summary: Preview dữ liệu
 *     description: Xem trước dữ liệu từ file đã upload
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên file đã upload
 *         example: 1234567890-test.xlsx
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEmails:
 *                       type: number
 *                       example: 428
 *                     recipients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                             example: customer@gmail.com
 *                           name:
 *                             type: string
 *                             example: Nguyễn Văn A
 *                           phone:
 *                             type: string
 *                             example: 0123456789
 *                           orderCount:
 *                             type: number
 *                             example: 2
 *       404:
 *         description: File không tồn tại
 *       500:
 *         description: Lỗi server
 */
app.get("/api/preview/:filename", (req, res) => {
    try {
        const filename = req.params.filename;

        // Validate filename
        if (!filename || filename.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Tên file không hợp lệ",
            });
        }

        const filePath = path.join(uploadsDir, filename);

        // Check if path exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File không tồn tại",
                filename: filename,
            });
        }

        // Check if it's a file (not a directory)
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                message: "Path là thư mục, không phải file",
                filename: filename,
            });
        }

        const emailGroups = readAndGroupOrders(filePath);

        res.json({
            success: true,
            data: {
                totalEmails: Object.keys(emailGroups).length,
                recipients: Object.entries(emailGroups).map(
                    ([email, data]) => ({
                        email: email,
                        name: data.name,
                        phone: data.phone,
                        orderCount: data.orders.length,
                    })
                ),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi đọc file",
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/send-emails-async/{filename}:
 *   post:
 *     tags: [Email]
 *     summary: Gửi email background (async)
 *     description: Gửi email trong background, trả response ngay lập tức. Tránh timeout với file lớn.
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên file đã upload
 *         example: 1234567890-test.xlsx
 *     responses:
 *       200:
 *         description: Job created successfully
 *       404:
 *         description: File không tồn tại
 *       500:
 *         description: Lỗi server
 */
app.post("/api/send-emails-async/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;

        console.log("=== ASYNC SEND EMAIL REQUEST ===");
        console.log("Filename param:", filename);

        if (!filename || filename.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Tên file không hợp lệ",
            });
        }

        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File không tồn tại",
                filename: filename,
            });
        }

        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                message: "Path là thư mục, không phải file",
            });
        }

        // Load config
        const config = loadEnv();
        if (!config) {
            return res.status(500).json({
                success: false,
                message: "Không tìm thấy file .env",
            });
        }

        // Tạo transporter
        const transporter = createTransporter(config);

        // Verify connection
        try {
            await transporter.verify();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Không thể kết nối đến SMTP server",
                error: error.message,
            });
        }

        // Đọc dữ liệu
        let emailGroups;
        try {
            emailGroups = readAndGroupOrders(filePath);
        } catch (readError) {
            return res.status(500).json({
                success: false,
                message: "Lỗi khi đọc file Excel",
                error: readError.message,
            });
        }

        const totalEmails = Object.keys(emailGroups).length;

        // Create job
        const job = createJob(filename, totalEmails);

        // Start background process (don't await)
        sendEmailsBatch(transporter, config, emailGroups, job.id).catch(error => {
            console.error(`[JOB] ${job.id} - Fatal error:`, error);
            job.status = JOB_STATUS.FAILED;
            job.error = error.message;
            job.completedAt = new Date().toISOString();
        });

        // Calculate estimated time
        const CONCURRENT_LIMIT = 10;
        const BATCH_DELAY = 2;
        const estimatedBatches = Math.ceil(totalEmails / CONCURRENT_LIMIT);
        const estimatedSeconds = estimatedBatches * BATCH_DELAY;
        const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

        // Return immediately
        res.json({
            success: true,
            message: "Đang gửi email trong background",
            job: {
                id: job.id,
                filename: filename,
                totalEmails: totalEmails,
                status: job.status,
                estimatedTime: `${estimatedMinutes} phút`,
                statusUrl: `/api/job-status/${job.id}`,
                createdAt: job.createdAt
            }
        });

        console.log(`[JOB] ${job.id} - Created and started background sending`);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi tạo job",
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/job-status/{jobId}:
 *   get:
 *     tags: [Email]
 *     summary: Kiểm tra trạng thái job
 *     description: Lấy thông tin chi tiết về tiến trình gửi email
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID từ response async
 *         example: job-1768467000-abc123
 *     responses:
 *       200:
 *         description: Job status
 *       404:
 *         description: Job không tồn tại
 */
app.get("/api/job-status/:jobId", (req, res) => {
    try {
        const jobId = req.params.jobId;
        const job = getJob(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job không tồn tại",
                jobId: jobId
            });
        }

        const response = {
            success: true,
            job: {
                id: job.id,
                filename: job.filename,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            }
        };

        // Add results if completed
        if (job.status === JOB_STATUS.COMPLETED) {
            const duration = new Date(job.completedAt) - new Date(job.startedAt);
            const durationMin = Math.floor(duration / 60000);
            const durationSec = Math.floor((duration % 60000) / 1000);

            response.job.duration = `${durationMin}m ${durationSec}s`;
            response.job.summary = {
                total: job.progress.total,
                success: job.progress.sent,
                failed: job.progress.failed
            };

            // Include sample results (first 10)
            response.job.results = job.results.slice(0, 10);
            
            if (job.results.length > 10) {
                response.job.resultsNote = `Showing 10 of ${job.results.length} results`;
            }
        }

        // Add error if failed
        if (job.status === JOB_STATUS.FAILED) {
            response.job.error = job.error;
        }

        res.json(response);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy job status",
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     tags: [Email]
 *     summary: Danh sách jobs
 *     description: Lấy danh sách tất cả jobs (10 jobs gần nhất)
 *     responses:
 *       200:
 *         description: Job list
 */
app.get("/api/jobs", (req, res) => {
    try {
        const jobList = Array.from(jobs.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(job => ({
                id: job.id,
                filename: job.filename,
                status: job.status,
                progress: job.progress,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            }));

        res.json({
            success: true,
            count: jobList.length,
            total: jobs.size,
            jobs: jobList
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách jobs",
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/send-emails/{filename}:
 *   post:
 *     tags: [Email]
 *     summary: Gửi email tự động (sync)
 *     description: Gửi email xác nhận đơn hàng cho tất cả khách hàng trong file (WARNING - Có thể timeout với file lớn)
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên file đã upload
 *         example: 1234567890-test.xlsx
 *     responses:
 *       200:
 *         description: Gửi email thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Hoàn thành gửi email
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 428
 *                     success:
 *                       type: number
 *                       example: 425
 *                     failed:
 *                       type: number
 *                       example: 3
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [success, failed]
 *                       orderCount:
 *                         type: number
 *                       error:
 *                         type: string
 *       404:
 *         description: File không tồn tại
 *       500:
 *         description: Lỗi server hoặc SMTP
 */
app.post("/api/send-emails/:filename", async (req, res) => {
    try {
        const filename = req.params.filename;

        // Extensive logging
        console.log("=== SEND EMAIL REQUEST ===");
        console.log("Filename param:", filename);
        console.log("__dirname:", __dirname);
        console.log("uploadsDir:", uploadsDir);

        // Validate filename
        if (!filename || filename.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Tên file không hợp lệ",
            });
        }

        const filePath = path.join(uploadsDir, filename);
        console.log("Constructed filePath:", filePath);

        // List all files in uploads directory for debugging
        try {
            const allFiles = fs.readdirSync(uploadsDir);
            console.log("Files in uploads directory:", allFiles);
        } catch (e) {
            console.error("Error listing uploads directory:", e.message);
        }

        // Check if path exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File không tồn tại",
                filename: filename,
                searchPath: filePath,
                uploadsDir: uploadsDir,
            });
        }

        // Check if it's a file (not a directory)
        const stats = fs.statSync(filePath);
        console.log("File stats:", {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
        });

        if (stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                message: "Path là thư mục, không phải file",
                filename: filename,
                filePath: filePath,
                hint: "Vui lòng cung cấp tên file cụ thể (ví dụ: 1234567890-test.xlsx)",
            });
        }

        // Load config
        const config = loadEnv();
        if (!config) {
            return res.status(500).json({
                success: false,
                message: "Không tìm thấy file .env",
            });
        }

        // Tạo transporter
        const transporter = createTransporter(config);

        // Verify connection
        try {
            await transporter.verify();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Không thể kết nối đến SMTP server",
                error: error.message,
            });
        }

        // Đọc dữ liệu
        console.log("About to read and group orders from:", filePath);
        let emailGroups;
        try {
            emailGroups = readAndGroupOrders(filePath);
        } catch (readError) {
            console.error("Error in readAndGroupOrders:", readError);
            return res.status(500).json({
                success: false,
                message: "Lỗi khi đọc file Excel",
                error: readError.message,
                filePath: filePath,
                stack: readError.stack,
            });
        }

        const totalEmails = Object.keys(emailGroups).length;
        console.log("Total emails to send:", totalEmails);

        // WARNING: This is synchronous and may timeout with large files
        // Recommend using /api/send-emails-async instead
        console.log("⚠️  WARNING: Using sync endpoint. May timeout with >100 emails. Consider /api/send-emails-async");

        // Gửi email với concurrent batching
        const CONCURRENT_LIMIT = 10;
        const BATCH_DELAY = 2000;
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        const entries = Object.entries(emailGroups);
        
        for (let i = 0; i < entries.length; i += CONCURRENT_LIMIT) {
            const batch = entries.slice(i, i + CONCURRENT_LIMIT);
            const batchNumber = Math.floor(i / CONCURRENT_LIMIT) + 1;
            const totalBatches = Math.ceil(entries.length / CONCURRENT_LIMIT);
            
            console.log(`[SYNC] Batch ${batchNumber}/${totalBatches} - Sending ${batch.length} emails...`);
            
            // Send batch in parallel
            const promises = batch.map(async ([email, customerData]) => {
                const result = await sendEmail(transporter, config, customerData);
                
                if (result.success) {
                    successCount++;
                    results.push({
                        email: email,
                        status: "success",
                        orderCount: customerData.orders.length,
                    });
                } else {
                    failCount++;
                    results.push({
                        email: email,
                        status: "failed",
                        error: result.error,
                        orderCount: customerData.orders.length,
                    });
                }
                
                return result;
            });
            
            await Promise.all(promises);
            
            // Delay between batches
            if (i + CONCURRENT_LIMIT < entries.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        res.json({
            success: true,
            message: "Hoàn thành gửi email",
            summary: {
                total: totalEmails,
                success: successCount,
                failed: failCount,
            },
            results: results,
            note: "Recommend using /api/send-emails-async for large files to avoid timeout"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi gửi email",
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/files:
 *   get:
 *     tags: [Files]
 *     summary: Liệt kê file
 *     description: Xem danh sách các file đã upload
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                         example: 1234567890-test.xlsx
 *                       size:
 *                         type: number
 *                         example: 12345
 *                       uploadedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Lỗi server
 */
app.get("/api/files", (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        // Filter only files (not directories)
        const fileList = files
            .filter((filename) => {
                const filePath = path.join(uploadsDir, filename);
                const stats = fs.statSync(filePath);
                return stats.isFile(); // Only include files
            })
            .map((filename) => {
                const filePath = path.join(uploadsDir, filename);
                const stats = fs.statSync(filePath);
                return {
                    filename: filename,
                    size: stats.size,
                    uploadedAt: stats.mtime,
                    isFile: true,
                };
            });

        res.json({
            success: true,
            count: fileList.length,
            files: fileList,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi đọc danh sách file",
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/files/{filename}:
 *   delete:
 *     tags: [Files]
 *     summary: Xóa file
 *     description: Xóa file đã upload
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên file cần xóa
 *         example: 1234567890-test.xlsx
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Xóa file thành công
 *       404:
 *         description: File không tồn tại
 *       500:
 *         description: Lỗi server
 */
app.delete("/api/files/:filename", (req, res) => {
    try {
        const filename = req.params.filename;

        // Validate filename
        if (!filename || filename.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Tên file không hợp lệ",
            });
        }

        const filePath = path.join(uploadsDir, filename);

        // Check if path exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File không tồn tại",
                filename: filename,
            });
        }

        // Check if it's a file (not a directory)
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa thư mục, chỉ xóa được file",
                filename: filename,
            });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: "Xóa file thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi khi xóa file",
            error: error.message,
        });
    }
});

// Start server
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
    const timestamp = new Date().toISOString();
    console.log("=".repeat(50));
    console.log(`[${timestamp}] SERVER STARTED`);
    console.log("=".repeat(50));
    console.log(`🚀 Server đang chạy tại http://${HOST}:${PORT}`);
    console.log(`📚 Swagger UI: http://${HOST}:${PORT}/api-docs`);
    console.log(`📝 API Docs: http://${HOST}:${PORT}`);
    console.log(`💡 Local access: http://localhost:${PORT}`);
    console.log(`📁 Uploads dir: ${uploadsDir}`);
    console.log(`🔧 Node version: ${process.version}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("=".repeat(50));

    // Test log to verify logging works
    console.log("[TEST] If you see this, logging is working!");
});
