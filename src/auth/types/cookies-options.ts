export const cookiesOptions = {
      httpOnly: true, // Prevents JavaScript from reading the cookie
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'lax', // Protects against CSRF attacks
} as const;