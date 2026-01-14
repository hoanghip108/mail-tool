const XLSX = require("xlsx");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { generateEmailHTML, generateEmailText } = require("./email-template");

// Load environment variables từ .env file
function loadEnv() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) {
        console.error("❌ Không tìm thấy file .env");
        console.log(
            "📝 Vui lòng copy file .env.example thành .env và điền thông tin SMTP"
        );
        process.exit(1);
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

// Tạo transporter cho nodemailer
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

// Đọc và nhóm dữ liệu từ Excel
function readAndGroupOrders(filePath) {
    console.log("📂 Đang đọc file:", filePath);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Tổng số dòng dữ liệu: ${data.length}`);

    // Nhóm theo email address
    const emailGroups = {};

    data.forEach((row) => {
        const email = row["Email Address"];
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

    return emailGroups;
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

// Main function
async function main() {
    console.log("🚀 Bắt đầu gửi email...\n");

    // Load config
    const config = loadEnv();

    // Tạo transporter
    const transporter = createTransporter(config);

    // Verify connection
    try {
        await transporter.verify();
        console.log("✅ Kết nối SMTP thành công!\n");
    } catch (error) {
        console.error("❌ Không thể kết nối đến SMTP server:", error.message);
        console.log("\n📝 Vui lòng kiểm tra lại thông tin trong file .env");
        process.exit(1);
    }

    // Đọc dữ liệu
    const inputFile = path.join(__dirname, "test.xlsx");
    const emailGroups = readAndGroupOrders(inputFile);

    const totalEmails = Object.keys(emailGroups).length;
    console.log(`📧 Tổng số email cần gửi: ${totalEmails}\n`);

    // Gửi email
    let successCount = 0;
    let failCount = 0;
    const failedEmails = [];

    for (const [email, customerData] of Object.entries(emailGroups)) {
        const orderCount = customerData.orders.length;
        process.stdout.write(`Đang gửi đến ${email} (${orderCount} đơn)... `);

        const result = await sendEmail(transporter, config, customerData);

        if (result.success) {
            console.log("✅ Thành công");
            successCount++;
        } else {
            console.log(`❌ Thất bại: ${result.error}`);
            failCount++;
            failedEmails.push({ email, error: result.error });
        }

        // Delay 1 giây giữa các email để tránh spam
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Thống kê
    console.log("\n" + "=".repeat(50));
    console.log("📊 KẾT QUẢ");
    console.log("=".repeat(50));
    console.log(`✅ Gửi thành công: ${successCount}/${totalEmails}`);
    console.log(`❌ Thất bại: ${failCount}/${totalEmails}`);

    if (failedEmails.length > 0) {
        console.log("\n❌ Danh sách email thất bại:");
        failedEmails.forEach(({ email, error }) => {
            console.log(`  - ${email}: ${error}`);
        });
    }

    console.log("\n✨ Hoàn thành!");
}

// Chạy script
main().catch((error) => {
    console.error("❌ Lỗi:", error);
    process.exit(1);
});
