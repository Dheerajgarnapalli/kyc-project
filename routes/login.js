const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bucket = require("../gcs");

router.post("/", async (req, res) => {
    try {
        const { email, password, productType } = req.body;

        if (!email || !password || !productType) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Hash the entered password
        const hashedPassword = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");

        const usersFile = bucket.file("users/users.json");

        const [exists] = await usersFile.exists();

        if (!exists) {
            return res.status(404).json({
                success: false,
                message: "No registered customers found."
            });
        }

        const [contents] = await usersFile.download();
        const users = JSON.parse(contents.toString());

        // Find user by email and product type
        const existingUser = users.find(
            user =>
                user.email.toLowerCase() === email.toLowerCase() &&
                user.productType === productType
        );

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Verify password
        if (existingUser.hashedPassword !== hashedPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid password."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            customerDid: existingUser.customerDid,
            name: existingUser.name,
            email: existingUser.email,
            productType: existingUser.productType
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;