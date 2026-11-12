
const isProduction = process.env.NODE_ENV === "production";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
};

export const accessCookieOptions = () => ({
    ...baseCookieOptions,
    path: "/",
});

export const refreshCookieOptions = () => ({
    ...baseCookieOptions,
    path: "/api/auth",
});

export const clearAccessCookieOptions = () => ({
    ...accessCookieOptions(),
});

export const clearRefreshCookieOptions = () => ({
    ...refreshCookieOptions(),
});
