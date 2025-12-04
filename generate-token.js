import jwt from "jsonwebtoken";

const SECRET = "05211aa18f20c572f05b6ddb8163c913c393da2698e05d9dc1925bd89d857c4a"; // your secret

function generateEmbedToken(userId) {
    return jwt.sign({
            user_id: userId,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365) // 1 year
        },
        SECRET
    );
}

const token = generateEmbedToken("6bc11343-278a-4a9b-8892-f62b0fea9e53");
console.log("Embed Token:", token);