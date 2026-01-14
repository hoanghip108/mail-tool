const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { generateEmailHTML, generateEmailText } = require('./email-template');

// Load environment variables từ .env file
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Không tìm thấy file .env');
        console.log('📝 Tạo file .env từ config-example.txt và điền thông tin SMTP của bạn');
        process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();
            envVars[key.trim()] = value;
        }
    });
    
    return envVars;
}

// Main function để test
async function testEmail() {
    console.log('🧪 TEST GỬI EMAIL\n');
    
    // Load config
    const config = loadEnv();
    
    console.log('📋 Cấu hình SMTP:');
    console.log(`  - Host: ${config.SMTP_HOST}`);
    console.log(`  - Port: ${config.SMTP_PORT}`);
    console.log(`  - User: ${config.SMTP_USER}`);
    console.log('');
    
    // Tạo transporter
    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT),
        secure: config.SMTP_SECURE === 'true',
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS
        }
    });
    
    // Verify connection
    try {
        console.log('⏳ Đang kết nối đến SMTP server...');
        await transporter.verify();
        console.log('✅ Kết nối SMTP thành công!\n');
    } catch (error) {
        console.error('❌ Không thể kết nối đến SMTP server:', error.message);
        console.log('\n📝 Vui lòng kiểm tra lại thông tin trong file .env');
        process.exit(1);
    }
    
    // Dữ liệu mẫu
    const testCustomerData = {
        email: config.SMTP_USER, // Gửi đến chính email của bạn để test
        name: 'Nguyễn Văn A',
        phone: '0123456789',
        orders: [
            {
                'Chọn Màu sắc & Size áo': 'Màu Matcha_Size 01',
                'Số lượng Combo': 2,
                'Địa chỉ nhận hàng': '123 Nguyễn Huệ, Quận 1, TP.HCM',
                'Thời gian nhận hàng': 'Cả ngày',
                'Mã Giao dịch': '11/01/2026 / 5389 - 63875',
                'Check CK': 'Khớp'
            },
            {
                'Chọn Màu sắc & Size áo': 'Màu Trắng_Size 02',
                'Số lượng Combo': 1,
                'Địa chỉ nhận hàng': '123 Nguyễn Huệ, Quận 1, TP.HCM',
                'Thời gian nhận hàng': 'Giờ hành chính',
                'Mã Giao dịch': '11/01/2026 / 5189 - 71455',
                'Check CK': 'Khớp'
            }
        ]
    };
    
    console.log('📧 Thông tin email test:');
    console.log(`  - Gửi đến: ${testCustomerData.email}`);
    console.log(`  - Tên khách: ${testCustomerData.name}`);
    console.log(`  - Số đơn: ${testCustomerData.orders.length}`);
    console.log('');
    
    try {
        console.log('⏳ Đang gửi email test...');
        
        const mailOptions = {
            from: `"${config.FROM_NAME}" <${config.FROM_EMAIL}>`,
            to: testCustomerData.email,
            subject: `[TEST] ${config.EMAIL_SUBJECT || 'Xác nhận đơn hàng của bạn'}`,
            text: generateEmailText(testCustomerData, testCustomerData.orders),
            html: generateEmailHTML(testCustomerData, testCustomerData.orders)
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Gửi email test thành công!');
        console.log(`📨 Message ID: ${info.messageId}`);
        console.log('');
        console.log('✨ Vui lòng kiểm tra hộp thư của bạn (bao gồm cả spam folder)');
        console.log('📝 Nếu email hiển thị đẹp, bạn có thể chạy: node send-emails.js để gửi hàng loạt');
        
    } catch (error) {
        console.error('❌ Lỗi khi gửi email:', error.message);
        process.exit(1);
    }
}

// Chạy test
testEmail().catch(error => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
});
