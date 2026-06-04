# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Lab Management System, please follow these steps:

1. **Do NOT** open a public issue
2. Email the details to: [sifah771166@gmail.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

## Security Best Practices

### For Deployment

1. **Change Default Passwords**
   - Never use default admin/user passwords in production
   - Use strong, unique passwords

2. **Environment Variables**
   - Never commit `.env` file to version control
   - Use strong JWT_SECRET in production
   - Keep sensitive data in environment variables

3. **HTTPS**
   - Always use HTTPS in production
   - Use valid SSL certificates

4. **Database**
   - Regular backups
   - Restrict database access
   - Use proper file permissions

5. **Server**
   - Keep Node.js and dependencies updated
   - Use firewall to restrict access
   - Monitor logs for suspicious activity

6. **Updates**
   - Regularly update dependencies: `npm audit fix`
   - Monitor security advisories
   - Apply security patches promptly

### Known Security Considerations

1. **Password Hashing**: Currently using SHA-256. Consider upgrading to bcrypt for production.
2. **Token Storage**: Tokens stored in localStorage. Consider using httpOnly cookies for enhanced security.
3. **Rate Limiting**: Not implemented. Consider adding rate limiting for production.
4. **CSRF Protection**: Not implemented. Consider adding CSRF tokens for production.

## Security Checklist for Production

- [ ] Changed all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enabled HTTPS
- [ ] Configured firewall
- [ ] Set up regular backups
- [ ] Implemented rate limiting
- [ ] Added CSRF protection
- [ ] Configured proper CORS
- [ ] Set up monitoring and logging
- [ ] Reviewed and updated dependencies
- [ ] Restricted file permissions
- [ ] Disabled debug mode

## Contact

For security concerns, contact: [sifah771166@gmail.com]
