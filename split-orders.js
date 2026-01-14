const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Đọc file Excel
const inputFile = path.join(__dirname, 'test.xlsx');
const outputFile = path.join(__dirname, 'output.xlsx');

console.log('Đang đọc file:', inputFile);

// Đọc workbook
const workbook = XLSX.readFile(inputFile);

// Lấy sheet đầu tiên (hoặc bạn có thể chỉ định sheet cụ thể)
const sheetName = workbook.SheetNames[0];
console.log(`Đang xử lý sheet: ${sheetName}`);

const worksheet = workbook.Sheets[sheetName];

// Chuyển đổi sang JSON với header
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Tổng số dòng dữ liệu: ${data.length}`);

// Đếm số lần xuất hiện của mỗi số điện thoại
const phoneCount = {};
const phoneOrders = {};

data.forEach((row, index) => {
    const phone = row['Số điện thoại'];
    
    if (phone) {
        // Chuẩn hóa số điện thoại (loại bỏ khoảng trắng)
        const normalizedPhone = String(phone).trim();
        
        if (!phoneCount[normalizedPhone]) {
            phoneCount[normalizedPhone] = 0;
            phoneOrders[normalizedPhone] = [];
        }
        
        phoneCount[normalizedPhone]++;
        phoneOrders[normalizedPhone].push(row);
    }
});

console.log(`\nThống kê:`);
console.log(`- Tổng số điện thoại unique: ${Object.keys(phoneCount).length}`);

// Phân loại đơn hàng
const singleOrders = []; // Đơn hàng chỉ đặt 1 lần
const multipleOrders = {}; // Đơn hàng đặt nhiều lần (key = số điện thoại)

Object.keys(phoneCount).forEach(phone => {
    if (phoneCount[phone] === 1) {
        singleOrders.push(...phoneOrders[phone]);
    } else {
        multipleOrders[phone] = phoneOrders[phone];
    }
});

console.log(`- Số điện thoại đặt 1 đơn: ${Object.keys(phoneCount).filter(p => phoneCount[p] === 1).length}`);
console.log(`- Số điện thoại đặt >1 đơn: ${Object.keys(multipleOrders).length}`);
console.log(`- Tổng đơn hàng đặt 1 lần: ${singleOrders.length}`);

// Tạo workbook mới
const newWorkbook = XLSX.utils.book_new();

// Thêm sheet cho đơn hàng đặt 1 lần
if (singleOrders.length > 0) {
    const singleOrderSheet = XLSX.utils.json_to_sheet(singleOrders);
    XLSX.utils.book_append_sheet(newWorkbook, singleOrderSheet, 'Đặt 1 đơn');
    console.log(`\n✓ Đã tạo sheet "Đặt 1 đơn" với ${singleOrders.length} đơn hàng`);
}

// Thêm sheet cho từng số điện thoại đặt nhiều đơn
let sheetIndex = 1;
Object.keys(multipleOrders).sort().forEach(phone => {
    const orders = multipleOrders[phone];
    const orderSheet = XLSX.utils.json_to_sheet(orders);
    
    // Tạo tên sheet (giới hạn 31 ký tự cho Excel)
    // Format: số_đơn - 4 số cuối SĐT
    const lastDigits = phone.slice(-4);
    const sheetName = `${orders.length}đơn-${lastDigits}`.substring(0, 31);
    
    XLSX.utils.book_append_sheet(newWorkbook, orderSheet, sheetName);
    console.log(`✓ Sheet "${sheetName}": ${phone} - ${orders.length} đơn hàng`);
    sheetIndex++;
});

// Lưu file
XLSX.writeFile(newWorkbook, outputFile);

console.log(`\n✅ Hoàn thành! File đã được lưu tại: ${outputFile}`);
console.log(`Tổng số sheet: ${newWorkbook.SheetNames.length}`);
