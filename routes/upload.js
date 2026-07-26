const express = require("express");
const router = express.Router();

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bucket = require("../gcs");

// Temporary uploads folder
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir
});

const uploadFields = upload.fields([
    { name: "proofOfIdentity", maxCount: 1 },
    { name: "proofOfAddress", maxCount: 1 },
    { name: "proofOfDOB", maxCount: 1 }
]);

router.post("/", uploadFields, async (req, res) => {

    try {

        const customerDid = req.body.customerDid;

        if (!customerDid) {
            return res.status(400).json({
                success: false,
                message: "Customer DID is required"
            });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No documents uploaded"
            });
        }

        const customerFolder = customerDid.replace(/:/g, "_");

        // Check customer exists
        const customerFile = bucket.file(
            `customers/${customerFolder}/customer.json`
        );

        const [exists] = await customerFile.exists();

        if (!exists) {

            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            return res.status(404).json({
                success: false,
                message: "Invalid Customer DID. Customer not found."
            });
        }

        // Read users.json
        const usersFile = bucket.file("users/users.json");
        const [usersContents] = await usersFile.download();
        const users = JSON.parse(usersContents.toString());

        const userIndex = users.findIndex(
            user => user.customerDid === customerDid
        );

        if (userIndex === -1) {

            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            return res.status(404).json({
                success: false,
                message: "Customer not found in users.json"
            });
        }

        if (!users[userIndex].documents) {
            users[userIndex].documents = {};
        }

        const uploadedDocuments = [];

        // Process each uploaded document
        for (const [documentType, files] of Object.entries(req.files)) {

            const file = files[0];

            // Read uploaded file
            const fileBuffer = fs.readFileSync(file.path);

            // Generate SHA-256 hash
            const fileHash = crypto
                .createHash("sha256")
                .update(fileBuffer)
                .digest("hex");

            // Preserve original extension
            const extension = path.extname(file.originalname);

            // Store using document type as filename
            const destination =
                `customers/${customerFolder}/${documentType}${extension}`;

            // Upload to Google Cloud Storage
            await bucket.upload(file.path, {
                destination
            });

            // Save metadata in users.json
            users[userIndex].documents[documentType] = {
                fileName: file.originalname,
                hash: fileHash,
                uploadedAt: new Date().toISOString()
            };

            uploadedDocuments.push({
                documentType,
                fileName: file.originalname,
                bucketPath: destination,
                hash: fileHash
            });

            // Delete temporary file
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }

        // Save updated users.json
        await usersFile.save(
            JSON.stringify(users, null, 2),
            {
                contentType: "application/json"
            }
        );

        res.status(200).json({
            success: true,
            message: "Documents uploaded successfully",
            customerDid,
            documents: uploadedDocuments
        });

    } catch (err) {

        // Clean up temporary files if an error occurs
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        console.error(err);

        res.status(500).json({
            success: false,
            message: "Upload failed",
            error: err.message
        });
    }

});

module.exports = router;