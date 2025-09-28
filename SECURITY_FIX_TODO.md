# 🔒 Security Fix Implementation TODO

## ⚡ IMMEDIATE ACTIONS REQUIRED (Critical - Fix NOW!)

### 1. ❌ Fix Unauthenticated File Access [CRITICAL]
**Current Issue:** Files are served without any authentication check
**File:** `server/src/api/file-serve.ts`

- [ ] **Replace** `file-serve.ts` with `file-serve-secure.ts`
- [ ] Update `server/src/server.ts` to import the secure version:
  ```typescript
  // Replace this line:
  import fileServeRoutes from './api/file-serve';
  // With:
  import fileServeRoutes from './api/file-serve-secure';
  ```
- [ ] Test file access with and without authentication
- [ ] Verify unauthorized users cannot access files

### 2. ❌ Fix Path Traversal & File Upload Security [HIGH]
**Current Issue:** No validation on filenames, allows any file type
**File:** `server/src/api/upload-local.ts`

- [ ] **Replace** `upload-local.ts` with `upload-local-secure.ts`
- [ ] Update `server/src/server.ts` to import the secure version:
  ```typescript
  // Replace this line:
  import uploadRoutes from './api/upload-local';
  // With:
  import uploadRoutes from './api/upload-local-secure';
  ```
- [ ] Test file upload with malicious filenames (e.g., `../../etc/passwd`)
- [ ] Test file upload with dangerous extensions (.exe, .sh, etc.)
- [ ] Verify file type validation works

### 3. ❌ Apply Enhanced Security Middleware [HIGH]
**Current Issue:** Weak input sanitization and missing protections
**File:** `server/src/middleware/security.ts`

- [ ] **Backup** current `security.ts` file
- [ ] **Replace** content with `security-enhanced.ts` or update imports
- [ ] Update all API routes to use enhanced middleware:
  ```typescript
  import { 
    validateInput, 
    xssProtection, 
    mongoSanitization,
    CSRFProtection 
  } from './middleware/security-enhanced';
  ```

---

## 📦 Required Package Installations

Run the following command to install missing security packages:

```bash
npm install --save \
  express-mongo-sanitize \
  xss-clean \
  hpp \
  express-validator \
  csurf \
  bcryptjs \
  express-rate-limit \
  helmet \
  cors
```

---

## 🛠️ Step-by-Step Implementation Guide

### Phase 1: Critical Fixes (Complete within 1 hour)

#### Step 1: Backup Current Files
```bash
# Create backup directory
mkdir server/src/backup

# Backup critical files
cp server/src/api/file-serve.ts server/src/backup/
cp server/src/api/upload-local.ts server/src/backup/
cp server/src/middleware/security.ts server/src/backup/
cp server/src/server.ts server/src/backup/
```

#### Step 2: Apply File Access Security
- [ ] Copy `file-serve-secure.ts` to `server/src/api/`
- [ ] Update imports in `server.ts`
- [ ] Add authentication middleware to file routes
- [ ] Test with curl:
  ```bash
  # Should fail without auth
  curl http://localhost:3001/api/v1/upload/files/userId/filename.pdf
  
  # Should work with valid token
  curl -H "Authorization: Bearer YOUR_TOKEN" \
       http://localhost:3001/api/v1/upload/files/userId/filename.pdf
  ```

#### Step 3: Apply Upload Security
- [ ] Copy `upload-local-secure.ts` to `server/src/api/`
- [ ] Update imports in `server.ts`
- [ ] Test file upload restrictions:
  ```bash
  # Should fail - dangerous extension
  curl -X POST -F "file=@malicious.exe" \
       -H "Authorization: Bearer YOUR_TOKEN" \
       http://localhost:3001/api/v1/upload/direct
  
  # Should succeed - safe file
  curl -X POST -F "file=@document.pdf" \
       -H "Authorization: Bearer YOUR_TOKEN" \
       http://localhost:3001/api/v1/upload/direct
  ```

#### Step 4: Apply Security Middleware
- [ ] Copy `security-enhanced.ts` to `server/src/middleware/`
- [ ] Update `server.ts` to use enhanced middleware:
  ```typescript
  import { 
    securityHeaders,
    mongoSanitization,
    xssProtection,
    validateInput,
    uploadLimiter
  } from './middleware/security-enhanced';
  
  // Apply globally
  app.use(securityHeaders);
  app.use(mongoSanitization);
  app.use(xssProtection);
  app.use(validateInput);
  ```

### Phase 2: High Priority Fixes (Complete within 24 hours)

#### Step 5: Add CSRF Protection
- [ ] Generate CSRF tokens for sessions
- [ ] Add CSRF middleware to all state-changing routes
- [ ] Update client to include CSRF tokens:
  ```typescript
  // In client/src/lib/api.ts
  const csrfToken = await api.get('/csrf-token');
  config.headers['X-CSRF-Token'] = csrfToken.data.token;
  ```

#### Step 6: Enhance Input Validation
- [ ] Add validation schemas to all endpoints
- [ ] Use express-validator for all user inputs
- [ ] Example for chat endpoints:
  ```typescript
  router.post('/conversations', [
    body('type').isIn(['direct', 'group']),
    body('participants').isArray().notEmpty(),
    body('name').optional().escape().trim(),
    handleValidationErrors
  ], async (req, res) => {
    // Handler code
  });
  ```

#### Step 7: Fix NoSQL Injection Points
- [ ] Escape regex special characters in search queries
- [ ] Use parameterized queries where possible
- [ ] Example fix:
  ```typescript
  // Before (vulnerable):
  { name: { $regex: userInput, $options: 'i' } }
  
  // After (secure):
  const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  { name: { $regex: escaped, $options: 'i' } }
  ```

### Phase 3: Medium Priority Fixes (Complete within 48 hours)

#### Step 8: Session Security
- [ ] Add session regeneration on login:
  ```typescript
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user._id;
    req.session.save();
  });
  ```
- [ ] Implement session timeout
- [ ] Add concurrent session limits

#### Step 9: Strengthen CSP
- [ ] Remove `unsafe-inline` and `unsafe-eval`
- [ ] Implement nonce-based CSP
- [ ] Update all inline scripts to use nonces

#### Step 10: Comprehensive Logging
- [ ] Implement audit logging for all sensitive operations
- [ ] Set up log monitoring and alerts
- [ ] Create security dashboard

---

## 🧪 Security Testing Checklist

After implementing each fix, test for:

### File Security Tests
- [ ] Cannot access files without authentication
- [ ] Cannot use path traversal (../, %2e%2e%2f)
- [ ] Cannot upload executable files
- [ ] Cannot upload files larger than limit
- [ ] File permissions are set correctly (640)

### Input Validation Tests
- [ ] XSS payloads are sanitized: `<script>alert('XSS')</script>`
- [ ] NoSQL injection is prevented: `{"$ne": null}`
- [ ] SQL injection is prevented (if applicable)
- [ ] Command injection is prevented
- [ ] Path traversal is prevented

### Authentication Tests
- [ ] Brute force protection works (5 attempts max)
- [ ] Session timeout works (30 minutes)
- [ ] CSRF tokens are validated
- [ ] Rate limiting is enforced

### API Security Tests
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}'
done

# Test XSS protection
curl -X POST http://localhost:3001/api/v1/chat/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"<script>alert(1)</script>"}'

# Test path traversal
curl http://localhost:3001/api/v1/upload/files/../../../etc/passwd
```

---

## 🚀 Quick Implementation Script

Create `apply-security-fixes.sh`:

```bash
#!/bin/bash

echo "🔒 Applying Security Fixes..."

# Backup current files
echo "📦 Creating backups..."
mkdir -p server/src/backup
cp server/src/api/file-serve.ts server/src/backup/ 2>/dev/null
cp server/src/api/upload-local.ts server/src/backup/ 2>/dev/null
cp server/src/middleware/security.ts server/src/backup/ 2>/dev/null

# Apply secure versions
echo "✅ Applying secure file handlers..."
cp server/src/api/file-serve-secure.ts server/src/api/file-serve.ts
cp server/src/api/upload-local-secure.ts server/src/api/upload-local.ts

# Update imports in server.ts
echo "📝 Updating server configuration..."
sed -i "s/import fileServeRoutes from '.\/api\/file-serve'/import fileServeRoutes from '.\/api\/file-serve-secure'/g" server/src/server.ts
sed -i "s/import uploadRoutes from '.\/api\/upload-local'/import uploadRoutes from '.\/api\/upload-local-secure'/g" server/src/server.ts

echo "✅ Security fixes applied!"
echo "⚠️  Please restart the server and run tests"
```

---

## 📊 Progress Tracking

### Critical Issues (P0)
- [ ] Unauthenticated file access
- [ ] Path traversal vulnerability
- [ ] No file type validation
- [ ] Missing rate limiting on uploads

### High Priority (P1)
- [ ] Weak input sanitization
- [ ] NoSQL injection risks
- [ ] Missing CSRF protection
- [ ] Weak CSP configuration

### Medium Priority (P2)
- [ ] Session security issues
- [ ] Information disclosure
- [ ] Missing audit logging
- [ ] No brute force protection

---

## 🎯 Success Criteria

The security fixes are complete when:

1. ✅ All files require authentication to access
2. ✅ Path traversal attacks are blocked
3. ✅ Only safe file types can be uploaded
4. ✅ All user input is properly sanitized
5. ✅ Rate limiting prevents abuse
6. ✅ CSRF tokens protect state-changing operations
7. ✅ Sessions are secure and timeout properly
8. ✅ All security events are logged
9. ✅ Penetration testing shows no critical vulnerabilities
10. ✅ Security headers score A+ on securityheaders.com

---

## 📞 Emergency Response

If a security breach is detected:

1. **Immediately disable affected endpoints**
2. **Rotate all secrets and tokens**
3. **Review audit logs for breach extent**
4. **Notify users within 72 hours (GDPR)**
5. **Document and fix the vulnerability**
6. **Conduct post-mortem analysis**

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

---

**Last Updated:** [Current Date]
**Priority:** CRITICAL - Implement immediately before production deployment
**Estimated Time:** 4-8 hours for critical fixes, 24-48 hours for complete implementation
