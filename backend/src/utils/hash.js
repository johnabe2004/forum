import crypto from "crypto";

const generateHash = () => {
    return crypto.randomBytes(8).toString("hex");
};

export { generateHash };