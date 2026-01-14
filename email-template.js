// Template email HTML
function generateEmailHTML(customerData, orders) {
    const { name, phone, email } = customerData;
    const orderCount = orders.length;

    // Tạo danh sách đơn hàng
    const orderList = orders
        .map((order, index) => {
            return `
<div style="background-color: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4CAF50;">
    <h3 style="margin-top: 0; color: #333;">Đơn hàng ${index + 1}</h3>
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 5px 0; font-weight: bold; width: 180px;">Số lượng Combo:</td>
            <td style="padding: 5px 0;">${order["Số lượng Combo"] || "N/A"}</td>
        </tr>
        <tr>
            <td style="padding: 5px 0; font-weight: bold; width: 180px;">Màu sắc & Size áo:</td>
            <td style="padding: 5px 0;">${
                order["Chọn Màu sắc & Size áo"] || "N/A"
            }</td>
        </tr>
        <tr>
            <td style="padding: 5px 0; font-weight: bold; width: 180px;">Địa chỉ nhận hàng:</td>
            <td style="padding: 5px 0;">${
                order["Địa chỉ nhận hàng"] || "N/A"
            }</td>
        </tr>
        <tr>
            <td style="padding: 5px 0; font-weight: bold; width: 180px;">Thời gian nhận:</td>
            <td style="padding: 5px 0;">${
                order["Thời gian nhận hàng"] || "N/A"
            }</td>
        </tr>
    </table>
</div>`;
        })
        .join("");

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[STORYDESK] XÁC NHẬN ĐƠN HÀNG NGẦU DESK</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="background-color: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
            <p style="font-size: 16px; margin-top: 0;">Hế lô bồ,</p>
            
            <p>Đét đã nhận đủ thông tin và xác nhận bạn <strong>đặt thành công combo NGẦU DESK</strong> với thông tin chi tiết như sau:</p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976d2;">Thông tin khách hàng</h3>
                <p style="margin: 5px 0;"><strong>Họ tên:</strong> ${name}</p>
                <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${phone}</p>
            </div>
            
            <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Chi tiết đơn hàng</h2>
            
            ${orderList}
            
            <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">Lưu ý quan trọng</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Thời gian giao hàng dự kiến: Từ <strong>20-30 ngày</strong> sau khi xác nhận đơn hàng. Đét sẽ cố gắng để NGẦU DESK tới tay các bồ trước dịp Tết Nguyên Đán.</li>
                    <li>Bạn sẽ nhận được tin nhắn SMS khi đơn hàng được giao cho đơn vị vận chuyển.</li>
                    <li>Nếu có bất kỳ vấn đề liên quan đến đơn hàng, bạn vui lòng liên hệ với Đét qua email này hoặc IG @storydesk.co.</li>
                </ul>
            </div>
            
            <div style="margin-top: 30px; text-align: left; padding: 20px; border-radius: 8px;">
                <p style="margin: 0; color: #666;">Cảm ơn bạn đã yêu thương và đồng hành cùng Storydesk.</p>
                <p style="margin: 10px 0; color: #667eea; font-weight: bold;">
                    Thân mến,
                </p>
                <p style="margin: 10px 0; color: #667eea; font-weight: bold;">
                    Chị Đét - Thủ kho NDS​
                </p>
            </div>
        </div>
        
        <div style="padding: 0; text-align: center; border-radius: 0 0 10px 10px; overflow: hidden;">
            <img src="https://ik.imagekit.io/eschoolhub/Tho%CC%82ng%20ba%CC%81o%20mail.png" alt="Storydesk" style="width: 100%; height: auto; display: block; margin: 0;">
        </div>
    </body>
    </html>
    `;
}

// Template email dạng text (fallback)
function generateEmailText(customerData, orders) {
    const { name, phone, email } = customerData;
    const orderCount = orders.length;

    let text = `
STORYDESK - XÁC NHẬN ĐỚN HÀNG
=====================================

Hế lô bồ,

Đét đã nhận đủ thông tin và xác nhận bạn <strong>đặt thành công combo NGẦU DESK </strong> với thông tin chi tiết như sau:

THÔNG TIN KHÁCH HÀNG
-------------------------------------
Họ tên: ${name}
Số điện thoại: ${phone}


CHI TIẾT ĐƠN HÀNG
-------------------------------------
`;

    orders.forEach((order, index) => {
        text += `
Đơn hàng ${index + 1}:
- Số lượng Combo: ${order["Số lượng Combo"] || "N/A"}
- Màu sắc & Size áo: ${order["Chọn Màu sắc & Size áo"] || "N/A"}
- Địa chỉ nhận hàng: ${order["Địa chỉ nhận hàng"] || "N/A"}
- Thời gian nhận: ${order["Thời gian nhận hàng"] || "N/A"}
`;
    });

    text += `
LƯU Ý QUAN TRỌNG
-------------------------------------
- Thời gian giao hàng dự kiến: Từ 20-30 ngày sau khi xác nhận đơn hàng. Đét sẽ cố gắng để NGẦU DESK tới tay các bồ trước dịp Tết Nguyên Đán
- Bạn sẽ nhận được tin nhắn SMS khi đơn hàng được giao cho đơn vị vận chuyển
- Nếu có bất kỳ vấn đề liên quan đến đơn hàng, bạn vui lòng liên hệ với Đét qua email này hoặc IG @storydesk.co

Cảm ơn bạn đã yêu thương và đồng hành cùng Storydesk.

Thân mến,
Chị Đét - Thủ kho NDS​

    `;
    return text;
}

module.exports = {
    generateEmailHTML,
    generateEmailText,
};
