// public/main.js

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  function updateTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString();
    }
  }

  setInterval(updateTime, 1000);
  updateTime();

  if (currentPage === 'signup.html' || currentPage === 'login.html') {
    if (userId) {
      window.location.href = 'index.html';
      return;
    }

    if (currentPage === 'signup.html') {
      // Signup logic
      const signupForm = document.getElementById('signup-form');

      signupForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        // Strong password check
        const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        if (!passwordPattern.test(password)) {
          alert('Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.');
          return;
        }

        fetch('/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        })
          .then(res => res.json())
          .then(data => {
            alert(data.message);
            if (data.message === 'Signup successful') {
              window.location.href = 'login.html';
            }
          });
      });
    } else if (currentPage === 'login.html') {
      // Login logic
      const loginForm = document.getElementById('login-form');

      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
          .then(res => res.json())
          .then(data => {
            if (data.userId) {
              localStorage.setItem('userId', data.userId);
              localStorage.setItem('username', data.username);
              window.location.href = 'index.html';
            } else {
              alert(data.message);
            }
          });
      });
    }
  } else {
    if (!userId) {
      window.location.href = 'login.html';
      return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
      });
    }

    // Show username in navbar
    const greetingElement = document.getElementById('greeting');
    if (greetingElement && username) {
      greetingElement.textContent = `Hello, ${username}`;
    }

    if (currentPage === 'index.html') {
      // Home page logic
      // No specific logic for the home page
    } else if (currentPage === 'books.html') {
      // Book management logic
      const bookList = document.getElementById('book-list');
      const addBookBtn = document.getElementById('add-book-btn');

      function loadBooks() {
        fetch('/books')
          .then(res => res.json())
          .then(data => {
            bookList.innerHTML = '';
            data.forEach(book => {
              const li = document.createElement('li');
              li.innerHTML = `
                <img src="${book.coverImage || 'images/default-cover.jpg'}" alt="${book.title}" style="width: 50px; height: 75px;" />
                <div>
                  <h3>${book.title}</h3>
                  <p>Author: ${book.author}</p>
                  <p>ISBN: ${book.isbn}</p>
                  <p>Publication Date: ${new Date(book.publicationDate).toLocaleDateString()}</p>
                  <p>Genre: ${book.genre}</p>
                  <p>Copies Available: ${book.copiesAvailable}</p>
                  <button onclick="editBook('${book._id}')">Edit</button>
                  <button onclick="deleteBook('${book._id}')">Delete</button>
                  <button onclick="borrowBook('${book._id}')" ${book.copiesAvailable < 1 ? 'disabled' : ''}>Borrow</button>
                </div>
              `;
              bookList.appendChild(li);
            });
          });
      }

      addBookBtn.addEventListener('click', () => {
        window.location.href = 'edit-book.html';
      });

      window.editBook = function(id) {
        window.location.href = `edit-book.html?id=${id}`;
      };

      window.deleteBook = function(id) {
        fetch(`/books/${id}`, {
          method: 'DELETE',
          headers: {
            userid: userId
          }
        }).then(() => {
          loadBooks();
        });
      };

      window.borrowBook = function(id) {
        fetch('/borrow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            userid: userId
          },
          body: JSON.stringify({ bookId: id })
        }).then(() => {
          alert('Book borrowed successfully');
          loadBooks();
        });
      };

      loadBooks();
    } else if (currentPage === 'edit-book.html') {
      // Edit book logic
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get('id');
      const bookForm = document.getElementById('book-form');

      if (bookId) {
        fetch(`/books/${bookId}`)
          .then(res => res.json())
          .then(book => {
            document.getElementById('title').value = book.title;
            document.getElementById('author').value = book.author;
            document.getElementById('isbn').value = book.isbn;
            document.getElementById('publicationDate').value = new Date(book.publicationDate).toISOString().split('T')[0];
            document.getElementById('genre').value = book.genre;
            document.getElementById('copiesAvailable').value = book.copiesAvailable;
            document.getElementById('coverImage').value = book.coverImage;
          });
      }

      bookForm.addEventListener('submit', e => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const author = document.getElementById('author').value;
        const isbn = document.getElementById('isbn').value;
        const publicationDate = document.getElementById('publicationDate').value;
        const genre = document.getElementById('genre').value;
        const copiesAvailable = document.getElementById('copiesAvailable').value;
        const coverImage = document.getElementById('coverImage').value;

        const bookData = { title, author, isbn, publicationDate, genre, copiesAvailable, coverImage };

        if (bookId) {
          fetch(`/books/${bookId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              userid: userId
            },
            body: JSON.stringify(bookData)
          }).then(() => {
            window.location.href = 'books.html';
          });
        } else {
          fetch('/books', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              userid: userId
            },
            body: JSON.stringify(bookData)
          }).then(() => {
            window.location.href = 'books.html';
          });
        }
      });
    } else if (currentPage === 'my-borrows.html') {
      const borrowList = document.getElementById('borrow-list');

      function loadBorrows() {
        fetch('/my-borrows', {
          headers: { userid: userId }
        })
          .then(res => res.json())
          .then(data => {
            borrowList.innerHTML = '';
            data.forEach(record => {
              const li = document.createElement('li');
              li.innerHTML = `
                <div>
                  <h3>${record.bookId.title}</h3>
                  <p>Author: ${record.bookId.author}</p>
                  <p>Borrowed On: ${new Date(record.borrowDate).toLocaleDateString()}</p>
                  <button onclick="returnBook('${record._id}')">Return Book</button>
                </div>
              `;
              borrowList.appendChild(li);
            });
          });
      }

      window.returnBook = function(borrowRecordId) {
        fetch('/return', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            userid: userId
          },
          body: JSON.stringify({ borrowRecordId })
        }).then(() => {
          alert('Book returned successfully');
          loadBorrows();
        });
      };

      loadBorrows();
    }
  }
});