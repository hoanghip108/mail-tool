const XLSX = require('xlsx');
const path = require('path');

// Test email priority
const filename = process.argv[2] || 'uploads/1768493697298-670756015-fix_mail(1).xlsx';
const filePath = path.join(__dirname, filename);

console.log('Testing email priority...\n');

const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows:', data.length);
console.log('\n=== Email Priority Test ===\n');

data.forEach((row, index) => {
    // Match the priority in server.js
    const email = row["Email Address"] || row["Email"] || row["Email "] || row["email"];
    
    console.log(`Row ${index + 1}:`);
    console.log('  Email (with space):', row["Email "]);
    console.log('  Email Address:', row["Email Address"]);
    console.log('  → Will use:', email);
    console.log('  Name:', row["Tên người nhận"]);
    console.log('  Phone:', row["Số điện thoại"]);
    console.log('');
});

// Group by email to see how many unique recipients
const emailGroups = {};
data.forEach(row => {
    const email = row["Email Address"] || row["Email"] || row["Email "] || row["email"];
    const phone = row["Số điện thoại"];
    
    if (email && phone) {
        const normalizedEmail = String(email).trim().toLowerCase();
        
        if (!emailGroups[normalizedEmail]) {
            emailGroups[normalizedEmail] = {
                email: normalizedEmail,
                count: 0
            };
        }
        emailGroups[normalizedEmail].count++;
    }
});

console.log('=== Summary ===');
console.log('Unique email recipients:', Object.keys(emailGroups).length);
console.log('\nRecipients:');
Object.entries(emailGroups).forEach(([email, data]) => {
    console.log(`  ${email} - ${data.count} order(s)`);
});
