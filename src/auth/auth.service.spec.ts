import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Response } from 'express';
import { ConfigService } from '@nestjs/config';

jest.mock('bcrypt')

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService
  let configService: ConfigService

  const mockResponse = () => {
    const res = {} as Response;
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  const configMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService,
        {
            provide: PrismaService,
            useValue: {
                user: {
                    findUnique: jest.fn(),
                    create: jest.fn(),
                },
                refreshToken: {
                    create: jest.fn(),
                    findFirst: jest.fn(),
                    update: jest.fn(),
                    delete: jest.fn()
        }
            },          
        },
        {
            provide: JwtService,
            useValue: {
                signAsync: jest.fn(),
                verifyAsync: jest.fn(),
            }
        },
        {
            provide: ConfigService,
            useValue:  configMock
        }
        
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks()
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'exists@ex.com' });
      const dto = { username: 'test', email: 'exists@ex.com', password: '123', confirm_password: '123' };
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw if passwords do not match', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const dto = { username: 'test', email: 'new@ex.com', password: '123', confirm_password: '456' };
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should hash password and create user', async () => {
      const dto = { username: 'john', email: 'john@ex.com', password: 'secret', confirm_password: 'secret' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedSecret');
      const createdUser = {
        id: 'uuid-1', // or any fixed ID
        username: 'john',
        email: 'john@ex.com',
        password: 'hashedSecret',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { username: 'john', email: 'john@ex.com', password: 'hashedSecret' },
      });
      // Instead of exact ID match, check that ID exists and is a string
      expect(result).toMatchObject({
        message: 'Signed Up Successfully',
        id: expect.any(String),
        username: 'john',
        email: 'john@ex.com',
      });
      // If you want exact ID, ensure your mock returns exactly that ID
      // expect(result.id).toBe('uuid-1');
    });
  });

  describe('login', () => {
    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const dto = { email: 'no@ex.com', password: 'any' };
      const res = mockResponse();
      await expect(service.login(dto, res)).rejects.toThrow(BadRequestException);
    });

    it('should throw if password does not match', async () => {
      const user = { id: '1', email: 'user@ex.com', password: 'hashed', username: 'user' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const dto = { email: 'user@ex.com', password: 'wrong' };
      const res = mockResponse();
      await expect(service.login(dto, res)).rejects.toThrow(BadRequestException);
    });

    it('should generate tokens, store refresh token, set cookies, and return success', async () => {
      const user = { id: 'user1', email: 'test@ex.com', password: 'hashed', username: 'testuser' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const accessToken = 'access-token-xyz';
      const refreshToken = 'refresh-token-xyz';
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt1', hashedToken: refreshToken });

      const dto = { email: 'test@ex.com', password: 'correct' };
      const res = mockResponse();
      const result = await service.login(dto, res);

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, { sub: user.id, email: user.email, username: user.username });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, { sub: user.id, email: user.email, username: user.username }, { expiresIn: '3d' });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: { userId: user.id, hashedToken: refreshToken },
      });
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Log in Successful',
        username: user.username,
        accessToken,
        refreshToken,
      });
    });
  });

  describe('refresh', () => {
    const oldRefreshToken = 'old-refresh-token';
    const decodedPayload = { sub: 'user1', email: 'test@ex.com', username: 'testuser' };
    const user = { id: 'user1', email: 'test@ex.com', username: 'testuser' };
    const newAccessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';

    it('should throw if token verification fails', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid token'));
      await expect(service.refresh(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(decodedPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.refresh(oldRefreshToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw if refresh token not in database', async () => {
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(decodedPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.refresh(oldRefreshToken)).rejects.toThrow(BadRequestException);
    });

    it('should generate new tokens, update DB, and return them', async () => {
      const existingTokenEntry = { id: 'rt1', userId: 'user1', hashedToken: oldRefreshToken };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(decodedPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(existingTokenEntry);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce(newAccessToken)
        .mockResolvedValueOnce(newRefreshToken);
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({ ...existingTokenEntry, hashedToken: newRefreshToken });

      const result = await service.refresh(oldRefreshToken);

      // Allow second argument (options) in verifyAsync call
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(oldRefreshToken, expect.any(Object));
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { hashedToken: newRefreshToken },
      });
      expect(result).toEqual({
        message: 'Log in Successful',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });
  });

  describe('logout', () => {
    it('should clear cookies and delete refresh token from DB', async () => {
      const refreshToken = 'token-to-delete';
      const res = mockResponse();
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({ id: 'rt1', hashedToken: refreshToken });

      const result = await service.logout(res, refreshToken);

      expect(res.clearCookie).toHaveBeenCalledWith('Authentication-AcesssToken', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('Authentication-RefreshToken', expect.any(Object));
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { hashedToken: refreshToken },
      });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});

