import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ACCESS_COOKIE } from "../config/cookies.js";

export const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.[ACCESS_COOKIE];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        if (decoded.type !== "access") {
            return res.status(401).json({
                success: false,
                message: "Invalid access token",
            });
        }

        const user = await User.findById(decoded.sub);

        if (
            !user ||
            !user.isEmailVerified ||
            user.accountStatus !== "active"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or unavailable account",
            });
        }

        req.user = user;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Session expired or invalid",
        });
    }
};