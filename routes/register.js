const express = require("express");
const router = express.Router();

const { v4: uuidv4 } = require("uuid");
const bucket = require("../gcs");

router.post("/", async (req, res) => {

    try {

        const { name, email ,password , productType} = req.body;

        if (!name || !email || !password || !productType) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const hashedPassword = require("crypto").createHash("sha256").update(password).digest("hex");

        const usersFile = bucket.file("users/users.json");

        let users = [];

        const [exists] = await usersFile.exists();

        if (exists) {
            const [contents] = await usersFile.download();
            users = JSON.parse(contents.toString());
        }

        const existingUser = users.find(
            user => user.email.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already registered",
                customerDid: existingUser.customerDid,
                message: `Registered in ${bankName}`
            });
        }

        const customerDid = "did:bank:" + uuidv4();

        users.push({
            customerDid,
            name,
            email,
            productType,
            hashedPassword
        });

        await usersFile.save(
            JSON.stringify(users, null, 2),
            {
                contentType: "application/json"
            }
        );

        const customer = {
            customerDid,
            name,
            email,
            productType,
            hashedPassword
        };

        await bucket.file(
            `customers/${customerDid.replace(/:/g, "_")}/customer.json`
        ).save(
            JSON.stringify(customer, null, 2),
            {
                contentType: "application/json"
            }
        );

        res.status(201).json({
            success: true,
            message: "Customer Registered Successfully",
            customerDid,
            productType,
            name,
            email

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message,
            productType 
        });

    }

});

module.exports = router;