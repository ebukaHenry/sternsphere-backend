-- ============================================================
-- STERNSPHERE DATABASE SCHEMA
-- PostgreSQL
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE NOT NULL,

    -- Nullable because Google OAuth users may not have a password
    password VARCHAR(255),

    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'teacher', 'admin')),

    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    verification_code VARCHAR(6),

    verification_expires TIMESTAMP,

    reset_token VARCHAR(64),

    reset_expires TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. COURSES
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,

    category_id INTEGER NOT NULL,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    thumbnail_url TEXT,

    instructor_name VARCHAR(100),

    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        CHECK (price >= 0),

    is_published BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_courses_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 4. LESSONS
-- ============================================================

CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,

    course_id INTEGER NOT NULL,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    content TEXT,

    video_url TEXT,

    duration INTEGER DEFAULT 0
        CHECK (duration >= 0),

    lesson_order INTEGER NOT NULL
        CHECK (lesson_order > 0),

    is_published BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lessons_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_lesson_order_per_course
        UNIQUE (course_id, lesson_order)
);


-- ============================================================
-- 5. ENROLLMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    course_id INTEGER NOT NULL,

    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP,

    CONSTRAINT fk_enrollments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_enrollments_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    -- A student cannot enroll in the same course twice
    CONSTRAINT unique_user_course_enrollment
        UNIQUE (user_id, course_id)
);


-- ============================================================
-- 6. LESSON PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    lesson_id INTEGER NOT NULL,

    -- Progress percentage: 0 - 100
    progress INTEGER NOT NULL DEFAULT 0
        CHECK (progress >= 0 AND progress <= 100),

    completed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Video position in seconds
    last_position INTEGER NOT NULL DEFAULT 0
        CHECK (last_position >= 0),

    completed_at TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_progress_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_progress_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons(id)
        ON DELETE CASCADE,

    -- One progress record per student per lesson
    CONSTRAINT unique_user_lesson_progress
        UNIQUE (user_id, lesson_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);


-- Courses
CREATE INDEX IF NOT EXISTS idx_courses_category
    ON courses(category_id);


-- Lessons
CREATE INDEX IF NOT EXISTS idx_lessons_course
    ON lessons(course_id);


-- Enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_user
    ON enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_course
    ON enrollments(course_id);


-- Lesson progress
CREATE INDEX IF NOT EXISTS idx_progress_user
    ON lesson_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_progress_lesson
    ON lesson_progress(lesson_id);


-- ============================================================
-- END OF SCHEMA
-- ============================================================