import crypto, { CipherGCM, DecipherGCM } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static saltLength = 32;
  private static tagLength = 16;
  private static ivLength = 16;
  private static keyLength = 32;

  /**
   * Generate a key pair for end-to-end encryption
   */
  static generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: process.env.KEY_PASSPHRASE || 'secure-passphrase'
      }
    });
  }

  /**
   * Encrypt a message using AES-256-GCM
   */
  static async encryptMessage(text: string, password: string): Promise<string> {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    const key = await scrypt(password, salt, this.keyLength) as Buffer;
    const cipher = crypto.createCipheriv(this.algorithm, key, iv) as CipherGCM;
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    return combined.toString('base64');
  }

  /**
   * Decrypt a message using AES-256-GCM
   */
  static async decryptMessage(encryptedData: string, password: string): Promise<string> {
    const combined = Buffer.from(encryptedData, 'base64');
    
    const salt = combined.slice(0, this.saltLength);
    const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = combined.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
    const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);
    
    const key = await scrypt(password, salt, this.keyLength) as Buffer;
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as DecipherGCM;
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }

  /**
   * Generate a secure room key for group chats
   */
  static generateRoomKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive data using SHA-256
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure token
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Encrypt data with RSA public key
   */
  static encryptWithPublicKey(data: string, publicKey: string): string {
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    return encrypted.toString('base64');
  }

  /**
   * Decrypt data with RSA private key
   */
  static decryptWithPrivateKey(encryptedData: string, privateKey: string, passphrase: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
        passphrase
      },
      buffer
    );
    return decrypted.toString('utf8');
  }

  /**
   * Generate HMAC for message integrity
   */
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  static verifyHMAC(data: string, hmac: string, secret: string): boolean {
    const expectedHMAC = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHMAC));
  }

  /**
   * Generate Diffie-Hellman keys for key exchange
   */
  static generateDHKeys() {
    const dh = crypto.createDiffieHellman(2048);
    const publicKey = dh.generateKeys('hex');
    const privateKey = dh.getPrivateKey('hex');
    const prime = dh.getPrime('hex');
    const generator = dh.getGenerator('hex');
    
    return {
      publicKey,
      privateKey,
      prime,
      generator
    };
  }

  /**
   * Compute shared secret using Diffie-Hellman
   */
  static computeSharedSecret(privateKey: string, otherPublicKey: string, prime: string, generator: string): string {
    const dh = crypto.createDiffieHellman(Buffer.from(prime, 'hex'), Buffer.from(generator, 'hex'));
    dh.setPrivateKey(Buffer.from(privateKey, 'hex'));
    return dh.computeSecret(Buffer.from(otherPublicKey, 'hex')).toString('hex');
  }
}

export default EncryptionService;
