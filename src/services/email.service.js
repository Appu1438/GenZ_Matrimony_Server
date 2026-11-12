
import nodemailer from "nodemailer";

// ==========================================
// CREATE EMAIL TRANSPORTER
// ==========================================

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

// ==========================================
// CHECK SMTP CONFIGURATION
// ==========================================

const isSMTPConfigured = () => {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
};

// ==========================================
// SEND EMAIL HELPER
// ==========================================

const sendEmail = async ({
    to,
    subject,
    text,
    html,
    type,
    url,
}) => {
    try {
        if (!isSMTPConfigured()) {
            if (process.env.NODE_ENV !== "production") {
                console.log("\n================================");
                console.log(`[DEV EMAIL] ${type}`);
                console.log("================================");
                console.log("To:", to);
                console.log("URL:", url);
                console.log("================================\n");

                return;
            }

            throw new Error("SMTP is not configured");
        }

        const transporter = createTransporter();

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html,
        });

        console.log(`${type} email sent:`, info.messageId);

        return info;

    } catch (error) {
        console.error(`${type} email error:`, error.message);
        throw error;
    }
};

// ==========================================
// SEND EMAIL VERIFICATION
// ==========================================

export const sendVerificationEmail = async ({
    to,
    name,
    url,
}) => {
    const text = `
Hi ${name},

Welcome to GenZ Matrimony.

Please verify your email address using the link below:

${url}

This link expires in 15 minutes.

If you did not create this account, you can ignore this email.

Regards,
GenZ Matrimony
    `.trim();

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333; line-height: 1.6;">
            <p>Hi ${name},</p>

            <p>Welcome to GenZ Matrimony.</p>

            <p>Please verify your email address using the link below:</p>

            <p><a href="${url}">Verify email address</a></p>

            <p>This link expires in 15 minutes.</p>

            <p>If you did not create this account, you can ignore this email.</p>

            <p>Regards,<br />GenZ Matrimony</p>
        </div>
    `;

    return sendEmail({
        to,
        subject: "Verify your GenZ Matrimony account",
        text,
        html,
        type: "Email verification",
        url,
    });
};

// ==========================================
// SEND PASSWORD RESET EMAIL
// ==========================================

export const sendPasswordResetEmail = async ({
    to,
    name,
    url,
}) => {
    const text = `
Hi ${name},

We received a request to reset your GenZ Matrimony password.

To choose a new password, open the link below:

${url}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.

Regards,
GenZ Matrimony
    `.trim();

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333; line-height: 1.6;">
            <p>Hi ${name},</p>

            <p>We received a request to reset your GenZ Matrimony password.</p>

            <p>To choose a new password, use the link below:</p>

            <p><a href="${url}">Reset your password</a></p>

            <p>This link expires in 15 minutes.</p>

            <p>If you did not request this, you can ignore this email.</p>

            <p>Regards,<br />GenZ Matrimony</p>
        </div>
    `;

    return sendEmail({
        to,
        subject: "Reset your GenZ Matrimony password",
        text,
        html,
        type: "Password reset",
        url,
    });
};
