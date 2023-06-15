import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';

import * as bcryptjs from 'bcryptjs';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt.payload';
import { LoginResponse } from './interfaces/login-response';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {

  constructor(
    @InjectModel(User.name) 
    private userModel: Model<User>,
    private jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    
    try {
      // 1- Encriptar contraseña
      const {password, ...userData} = createUserDto;
      const newUser = new this.userModel({
        password: bcryptjs.hashSync(password, 10),
        ...userData,
      })

        // 2- Guardar el usuario
        // 3- Generar el JWT 
      await newUser.save();
      const {password:_, ...user} = newUser.toJSON();
      return user;
      
    } catch (error) {
      if(error.code === 11000) {
        throw new BadRequestException(`${createUserDto.email} already exists.`)
      }
      throw new InternalServerErrorException('Something went wrong')
    }


  }

  async register(RegisterDto: RegisterDto): Promise<LoginResponse> {

    const userRegister = await this.create(RegisterDto);
    return {
      user: userRegister, 
      token: this.getJwtToken({id: userRegister._id})
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const {email, password} = loginDto;

    const user = await this.userModel.findOne({ email: email})
    if (!user) {
      throw new UnauthorizedException('Not valid credentials - email');
    }

    if (!bcryptjs.compareSync(password, user.password)) {
      throw new UnauthorizedException('Not valid credentials - password');
    }

    const {password:_, ...rest} = user.toJSON();

    return {
      user: rest,
      token: this.getJwtToken({id: user.id})
    }
  }


  findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  async findUserbyId( id: string) {
    const user = await this.userModel.findById(id);
    const {password, ...rest} = user.toJSON();
    return rest;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
}
