import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticateUser = (req, res, next) => {
    // const token = req.headers.authorization?.split(" ")[1]; // Get token from Authorization header

    // console.log(req.headers.cookie);
    let receivedToken = req.headers.cookie;

    if (!receivedToken) {
        return res.status(401).json({ status: "FAIL", message: "No token provided" });
    }

    // console.log(receivedToken.split(" ")[1],"ejjhfeuh")

    let token = receivedToken.replace("token=", "");

    console.log(token)

    if (!token) {
        return res.status(401).json({ status: "FAIL", message: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ status: "FAIL", message: "Invalid token" });
        }

        req.userID = decoded.id; // Attach userID to the request object

        console.log(req.userID,"jefebfefh")
        next();
    });
};