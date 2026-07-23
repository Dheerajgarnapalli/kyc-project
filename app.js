const express = require("express");

const registerRoute = require("./routes/register");
const uploadRoute = require("./routes/upload");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to KYC Server"
    });

});

app.use("/register", registerRoute);
app.use("/upload", uploadRoute);

app.listen(8000, () => {
    console.log("Server running on port 8000");
});