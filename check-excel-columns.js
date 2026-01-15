const XLSX = require('xlsx');
const path = require('path');

// Check Excel file columns
const filename = process.argv[2];

if (!filename) {
    console.log('Usage: node check-excel-columns.js <filename>');
    console.log('Example: node check-excel-columns.js uploads/test.xlsx');
    process.exit(1);
}

const filePath = path.join(__dirname, filename);

try {
    console.log('Reading file:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('\n=== FILE INFO ===');
    console.log('Sheet name:', sheetName);
    console.log('Total rows:', data.length);
    
    if (data.length === 0) {
        console.log('\n⚠️  WARNING: No data found in file!');
        process.exit(1);
    }
    
    // Get column names from first row
    const columns = Object.keys(data[0]);
    
    console.log('\n=== COLUMNS FOUND ===');
    columns.forEach((col, index) => {
        console.log(`${index + 1}. "${col}"`);
    });
    
    // Check required columns (with variants)
    console.log('\n=== VALIDATION ===');
    
    // Email variants
    const hasEmail = columns.includes('Email') || columns.includes('Email ') || columns.includes('Email Address') || columns.includes('email');
    const emailStatus = hasEmail ? '✅' : '❌';
    console.log(`${emailStatus} Required: "Email" (or variants: "Email ", "Email Address")`);
    
    // Phone
    const hasPhone = columns.includes('Số điện thoại');
    const phoneStatus = hasPhone ? '✅' : '❌';
    console.log(`${phoneStatus} Required: "Số điện thoại"`);
    
    // Name
    const hasName = columns.includes('Tên người nhận');
    const nameStatus = hasName ? '✅' : '❌';
    console.log(`${nameStatus} Required: "Tên người nhận"`);
    
    let hasErrors = !hasEmail || !hasPhone || !hasName;
    
    // Optional columns
    console.log('');
    const optionalColumns = [
        'Sản phẩm',
        'Combo', 
        'Số lượng',
        'Đơn giá',
        'Số lượng Combo',
        'Chọn Màu sắc & Size áo',
        'Địa chỉ nhận hàng'
    ];
    
    optionalColumns.forEach(optional => {
        const found = columns.includes(optional);
        const status = found ? '✅' : '⚠️ ';
        console.log(`${status} Optional: "${optional}"`);
    });
    
    console.log('');
    optionalColumns.forEach(optional => {
        const found = columns.includes(optional);
        const status = found ? '✅' : '⚠️ ';
        console.log(`${status} Optional: "${optional}"`);
    });
    
    // Show sample data
    console.log('\n=== SAMPLE DATA (First 3 rows) ===');
    data.slice(0, 3).forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        console.log(JSON.stringify(row, null, 2));
    });
    
    // Summary
    console.log('\n=== SUMMARY ===');
    if (hasErrors) {
        console.log('❌ File has MISSING required columns!');
        console.log('\nExpected columns:');
        console.log('  - Email');
        console.log('  - Số điện thoại');
        console.log('  - Tên người nhận');
        console.log('  - Sản phẩm (optional)');
        console.log('  - Combo (optional)');
        console.log('  - Số lượng (optional)');
        console.log('  - Đơn giá (optional)');
        process.exit(1);
    } else {
        console.log('✅ File has all required columns!');
        console.log(`📧 Will send to ${data.length} email addresses`);
    }
    
} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
}
