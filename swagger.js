const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Email Automation API",
            version: "1.0.0",
            description: "API để upload file Excel và gửi email tự động cho khách hàng",
            contact: {
                name: "Storydesk",
                email: "support@storydesk.co",
            },
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Development server (Local)",
            },
            {
                url: "https://c1293854e14e.ngrok-free.app",
                description: "Ngrok Tunnel",
            },
        ],
        tags: [
            {
                name: "Health",
                description: "Health check endpoint",
            },
            {
                name: "Files",
                description: "File upload và quản lý",
            },
            {
                name: "Email",
                description: "Gửi email tự động",
            },
        ],
    },
    apis: ["./server.js"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
