import { Injectable } from '@angular/core'
import { DatabaseService } from './database'

@Injectable({ providedIn: 'root' })
export class UserService {
  private initialized = false

  constructor(private db: DatabaseService) {
    this.init()
  }

  private async init() {
    if (!this.initialized) {
      await this.db.init()
      this.initialized = true
    }
  }

  async register(username: string, password: string): Promise<number> {
    await this.init()
    const ts = Date.now()
    console.log('Registering user:', username)
    const res: any = await this.db.run(
      `INSERT INTO users (username, password, createdAt) VALUES (?,?,?)`,
      [username, password, ts]
    )
    console.log('Register result:', res)
    const userId = res.changes?.lastId ?? -1
    console.log('User ID:', userId)
    return userId
  }

  async login(username: string, password: string): Promise<boolean> {
    await this.init()
    const res: any = await this.db.query(
      `SELECT * FROM users WHERE username=? AND password=?`,
      [username, password]
    )
    return (res.values?.length ?? 0) > 0
  }

  async getAllUsers(): Promise<any[]> {
    // ensure DB is initialized
    await this.init()
    console.log('Querying all users...')
    const res: any = await this.db.query('SELECT * FROM users ORDER BY id ASC', [])
    console.log('Query result:', res)
    console.log('Users values:', res.values)
    return res.values ?? []
  }

}
