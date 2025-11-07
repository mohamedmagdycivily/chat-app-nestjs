import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../models/user.model';
import { Transaction } from 'sequelize';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(UserModel, 'main')
    private userModel: typeof UserModel,
  ) {}

  async createUser(userData: any, transaction?: Transaction): Promise<any> {
    const createdUser = await this.userModel.create(
      {
        ...userData,
      },
      { transaction },
    );

    return createdUser && createdUser.get({ plain: true });
  }

  async getUserById(id: number, transaction?: Transaction): Promise<any> {
    const userData = await this.userModel.findByPk(id, { transaction });
    return userData && userData.get({ plain: true });
  }

  async getUserByPhone(phone: string, transaction?: Transaction): Promise<any> {
    const userData = await this.userModel.findOne({
      where: { phone },
      transaction,
    });
    return userData && userData.get({ plain: true });
  }

  async getUserByFilters(
    filters: Partial<any>,
    transaction?: Transaction,
  ): Promise<any> {
    if (!filters || typeof filters !== 'object') {
      return null;
    }

    const userData = await this.userModel.findOne({
      where: filters as any,
      transaction,
    });
    return userData && userData.get({ plain: true });
  }

  async setUserPassword(
    userId: number,
    password: string,
    transaction?: Transaction,
  ) {
    const userDataInstance = await this.userModel.findByPk(userId, {
      transaction,
    });
    await userDataInstance.update(
      {
        password,
      },
      { transaction },
    );
    return userDataInstance.get({ plain: true });
  }

  async updateUserPhone(
    userId: number,
    phone: string,
    transaction?: Transaction,
  ) {
    const userDataInstance = await this.userModel.findByPk(userId, {
      transaction,
    });
    await userDataInstance.update(
      {
        phone,
      },
      { transaction },
    );
    return userDataInstance.get({ plain: true });
  }

  async updateUserData(
    userId: number,
    name: string,
    nationalId: string,
    transaction?: Transaction,
  ) {
    const userDataInstance = await this.userModel.findByPk(userId, {
      transaction,
    });
    await userDataInstance.update(
      {
        name,
        nationalId,
      },
      { transaction },
    );
    return userDataInstance.get({ plain: true });
  }
}
