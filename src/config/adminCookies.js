
const isProduction = process.env.NODE_ENV === "production";

export const ADMIN_ACCESS_COOKIE = "adminAccessToken";
export const ADMIN_REFRESH_COOKIE = "adminRefreshToken";

const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
};

export const adminAccessCookieOptions = () => ({
    ...baseCookieOptions,
    path: "/",
});

export const adminRefreshCookieOptions = () => ({
    ...baseCookieOptions,
    path: "/api/admin/auth",
});

export const clearAdminAccessCookieOptions = () => ({
    ...adminAccessCookieOptions(),
    expires: new Date(0),
});

export const clearAdminRefreshCookieOptions = () => ({
    ...adminRefreshCookieOptions(),
    expires: new Date(0),
});
