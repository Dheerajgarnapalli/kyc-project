const express = require("express");
const router = express.Router();

const { v4: uuidv4 } = require("uuid");
const bucket = require("../gcs");

router.post("/", async (req, res) => {

    try {

        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and Email are required"
            });
        }

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
                customerDid: existingUser.customerDid
            });
        }

        const customerDid = "did:bank:" + uuidv4();

        users.push({
            customerDid,
            name,
            email
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
            email
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
            customerDid
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;