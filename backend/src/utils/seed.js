// Populates the database with sample users, questions, and answers so the
// UI looks like the designs instead of being empty. Run once with:
// node src/utils/seed.js
// Safe to re-run — it skips users that already exist by email.
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { generateQuestionHash } from "../utils/questionHash.js";


const users = [
  {
    firstName: "Abebe",
    lastName: "Kebede",
    email: "abebe@example.com",
    password: "password123",
  },
  {
    firstName: "New",
    lastName: "User",
    email: "newuser@example.com",
    password: "password123",
  },
  {
    firstName: "String",
    lastName: "String",
    email: "string@example.com",
    password: "password123",
  },
];

// title/content pairs pulled straight from the dashboard design mockup,
// so the seeded feed visually matches what the designer intended.
const questionsByEmail = {
  "abebe@example.com": [
    {
      title:
        "React Router: useParams() returns undefined after hard refresh on dynamic route",
      content:
        "I have a route like /question/:questionHash and I read the param using useParams(). Expected: refreshing the page on /question/abc123 should still show the question details. Actual: after a hard refresh, questionHash is undefined and my fetch call fails.\n\nWhat are the common causes for this (route config vs server fallback), and what should I verify first?",
    },
    {
      title:
        "Why does my Express API return 404 even though the route exists in app.js?",
      content:
        "I recently added a new route in Express, but requests to it still return 404. I have checked the route path and method, but I am not sure whether the problem is the order of middleware, a missing router mount, or a mismatch between the path registered and the URL I am hitting.\n\nWhat is the quickest way to debug this?",
    },
  ],
  "newuser@example.com": [
    {
      title: "How to design a scalable QR code digital menu system?",
      content:
        "I'm building a web app that lets restaurants create digital menus that customers can access by scanning a QR code. I want the system to be fast, scalable, and easy to update. What are the best practices for designing this kind of application? How should I structure the database for menus and items? How can I make sure the app scales well as more restaurants join?",
    },
    {
      title:
        "How to design a scalable Role-Based Access Control (RBAC) system?",
      content:
        "I'm designing a role-based access control (RBAC) system for a web application, and I'm trying to figure out the best way to structure permissions and roles in a scalable and maintainable way. The application has multiple user types (e.g., admin, manager, regular user), and each role can have different permissions such as creating, reading, updating, or deleting resources.",
    },
    {
      title:
        "How do I replace promise based javascript code with async await syntax?",
      content:
        "I'm trying to understand how to properly convert Promise-based JavaScript code into async/await syntax, and I'm looking for a deeper explanation rather than just simple examples. I already know that async/await is built on top of Promises, but I'm struggling with how to refactor real-world code that uses .then() and .catch() chains.",
    },
    {
      title: "How do I properly validate file uploads in Node.js?",
      content:
        "I am creating a service that accepts PDF uploads from users. I want to validate the file type, size, and extension before saving it. What is the safest way to do this with Express and Multer?",
    },
  ],
  "string@example.com": [
    {
      title: "Lexical scoping and inner functions in JS",
      content:
        "When I declare a function inside another function, the inner function has access to the outer function's variables even after it has returned. Is this what lexical scoping means?",
    },
    {
      title: "Understanding Closures in JavaScript",
      content:
        "I keep hearing about closures in JS interviews but I don't really get it. Can someone provide a simple, real-world example of a closure and why it is useful?",
    },
    {
      title: "MySQL vs MongoDB for a chat application",
      content:
        "I am building a real-time chat app. Should I use a NoSQL database because the messages are unstructured, or stick to SQL for better data integrity? Looking for pros and cons.",
    },
    {
      title: "What is the difference between SQL and NoSQL?",
      content:
        "I am starting a new project and I need to choose a database. When should I use a relational database like MySQL or PostgreSQL, versus a document database like MongoDB?",
    },
    {
      title: "How to connect MySQL database to Node.js?",
      content:
        "I am building a backend API using Node.js and Express. I want to use MySQL as my database. What is the best library to use (mysql2, sequelize, etc.) and how do I establish a connection?",
    },
    {
      title: "Understanding React useEffect dependency array",
      content:
        "I am having trouble understanding when to put variables in the useEffect dependency array. Sometimes my effect runs infinitely, and other times it does not run when I expect it to. Can someone explain the rules for the dependency array?",
    },
    {
      title: "How to fix CORS error in Node.js Express backend?",
      content:
        "My React frontend is running on localhost:3000 and my Express backend is on localhost:3777. When I try to make a fetch request from React to Express, I get a CORS policy error in the browser console. How do I configure Express to allow these requests?",
    },
    {
      title:
        "What is the difference between let, const, and var in JavaScript?",
      content:
        "I am learning JavaScript and I see people using var, let, and const to declare variables. I know const is for constants, but what is the real difference between let and var? When should I use which?",
    },
    {
      title: "How do I center a div in CSS?",
      content:
        "I have been trying to center a div both vertically and horizontally inside its parent container, but I am struggling. I have tried using margins but it does not seem to work perfectly. What is the modern and most reliable way to achieve this using CSS?",
    },
    {
      title: "how to install reactjs using vite",
      content: "how to install using vite cli tool?",
    },
    {
      title: "Why does my React component re-render too often?",
      content:
        "I am using state and props in a React component, but it seems to re-render more often than expected. I want to understand the lifecycle and avoid unnecessary renders. What patterns should I use to optimize performance?",
    },
    {
      title:
        "How can I make a Node.js API respond with JSON and status codes properly?",
      content:
        "I am building an API and want to send consistent JSON responses with correct HTTP status codes. What are the best practices for structuring success and error responses to make frontend handling easier?",
    },
  ],
};

async function seed() {
  const userIdByEmail = {};

  for (const u of users) {
    const [existing] = await pool.query(
      "SELECT user_id FROM users WHERE email = ?",
      [u.email],
    );
    if (existing.length > 0) {
      userIdByEmail[u.email] = existing[0].user_id;
      console.log(`User already exists: ${u.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
      [u.firstName, u.lastName, u.email, passwordHash],
    );
    userIdByEmail[u.email] = result.insertId;
    console.log(`Created user: ${u.email} (password: ${u.password})`);
  }

  for (const [email, questions] of Object.entries(questionsByEmail)) {
    const userId = userIdByEmail[email];
    for (const q of questions) {
      const [existing] = await pool.query(
        "SELECT id FROM questions WHERE title = ?",
        [q.title],
      );
      if (existing.length > 0) {
        console.log(`Question already exists: ${q.title}`);
        continue;
      }
      const hash = generateQuestionHash();
      await pool.query(
        "INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)",
        [hash, userId, q.title, q.content],
      );
      console.log(`Created question: ${q.title}`);
    }
  }

  // One sample answer, matching the question-detail design.
  const [[question]] = await pool.query(
    "SELECT id, question_hash FROM questions WHERE title LIKE 'React Router: useParams()%' LIMIT 1",
  );
  if (question) {
    const [existingAnswer] = await pool.query(
      "SELECT id FROM answers WHERE question_id = ?",
      [question.id],
    );
    if (existingAnswer.length === 0) {
      await pool.query(
        "INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)",
        [
          question.id,
          userIdByEmail["newuser@example.com"],
          'Most common cause on hard refresh: the browser asks the server for /question/abc123. If the server is not configured to serve your SPA\'s index.html for that path, you get a 404 or a different document — your React app may not mount with the route you expect, or a fallback page loads without the router seeing the URL.\n\nVerify first: (1) Dev/prod server: Vite preview/production needs SPA fallback (history API) so every path returns index.html. (2) Route definition: confirm a parent <Route path="/question/:questionHash" /> (or equivalent) exists and matches the URL you refresh on — typos, missing :param, or a different basename break useParams(). (3) Quick sanity check: after refresh, log window.location.pathname and compare to your declared routes. If the path is correct but useParams() is still wrong, the mismatch is almost always in the route tree (nested routes, relative paths, or duplicate routers).',
        ],
      );
      console.log("Created sample answer.");
    }
  }

  console.log(
    "✅ Seeding complete. NOTE: run backfillEmbeddings.js afterward if you want Related Questions to work on these.",
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
