import bcrypt from "bcrypt";
const SALT_ROUNDS = 10;
const hashPassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return passwordHash;
};


const comparePassword = async (password, passwordHash) => {
  const isMatch = await bcrypt.compare(password, passwordHash);
  return isMatch;
};
export { hashPassword, comparePassword };
