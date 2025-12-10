"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function Profile() {
    const { user, error, isLoading } = useUser();

    if (isLoading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error.message}</div>;
    if (!user) return null;

    return (
        <div className="profile">
            {user.picture && (
                <img
                    src={user.picture}
                    alt={user.name || "User"}
                    className="profile-picture"
                />
            )}
            <h2>{user.name}</h2>
            <p>{user.email}</p>
        </div>
    );
}
