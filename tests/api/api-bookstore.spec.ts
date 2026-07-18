import { test, expect } from '@playwright/test';

const baseURL = 'https://demoqa.com';

type UserPayload = {
  userName: string;
  password: string;
};

type CreatedUser = {
  userID: string;
  username: string;
  books: Array<{ isbn: string }>;
};

type Book = {
  isbn: string;
  title: string;
  author: string;
};

async function createUser(payload: UserPayload) {
  const response = await fetch(`${baseURL}/Account/v1/User`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  expect(response.status).toBe(201);
  return (await response.json()) as CreatedUser;
}

async function generateToken(username: string, password: string) {
  const response = await fetch(`${baseURL}/Account/v1/GenerateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: username, password }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  return body.token as string;
}

async function addBookToCollection(
  token: string,
  userId: string,
  isbn: string,
) {
  const response = await fetch(`${baseURL}/BookStore/v1/Books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, collectionOfIsbns: [{ isbn }] }),
  });

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.books).toEqual([{ isbn }]);
}

async function getUserBooks(token: string, userId: string) {
  const response = await fetch(`${baseURL}/Account/v1/User/${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status).toBe(200);
  return (await response.json()).books as Array<{ isbn: string }>;
}

async function deleteBookFromCollection(
  token: string,
  userId: string,
  isbn: string,
) {
  const response = await fetch(`${baseURL}/BookStore/v1/Book`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, isbn }),
  });

  expect(response.status).toBe(204);
}

async function deleteUser(token: string, userId: string) {
  const response = await fetch(`${baseURL}/Account/v1/User/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status).toBe(204);
}

test('API flow: register, login, add, list, delete, and delete user', async () => {
  const uniqueSuffix = Date.now();
  const username = `apiuser${uniqueSuffix}`;
  const password = 'Test@1234!';
  const isbn = '9781449325862';

  const createdUser = await createUser({ userName: username, password });
  const token = await generateToken(username, password);
  await addBookToCollection(token, createdUser.userID, isbn);
  const books = await getUserBooks(token, createdUser.userID);
  expect(books.some((book) => book.isbn === isbn)).toBeTruthy();
  await deleteBookFromCollection(token, createdUser.userID, isbn);
  const remainingBooks = await getUserBooks(token, createdUser.userID);
  expect(remainingBooks.some((book) => book.isbn === isbn)).toBeFalsy();
  await deleteUser(token, createdUser.userID);
});
