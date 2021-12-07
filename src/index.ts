import axios from "axios"
import { config } from 'dotenv';
import { ManagementClient } from 'auth0'
import fs from 'fs'
import { Parser } from 'json2csv';


config();

const roles = [
  {
    id: process.env.ROLE_ID_GUILD_MEMBER,
    name: 'Guild member'
  }
  , {
    id: process.env.ROLE_ID_GUILD_ADMIN,
    name: 'Guild admin'
  },
  {
    id: process.env.ROLE_ID_GUILD_SUPER_USER,
    name: 'Guild super user'
  }
  
]

const getToken = async () => {
  try {
    const url = `${process.env.AUTH0_BASE_URL}/oauth/token`;
    const payload = {
      "audience": `${process.env.AUTH0_AUDIENCE}/api/v2/`,
      "client_id": process.env.AUTH0_USER_ADMIN_CLIENT_ID,
      "client_secret": process.env.AUTH0_USER_ADMIN_CLIENT_SECRET,
      "grant_type": "client_credentials",
    }
    const headers = {"content-type": 'application/json' };

    const res = await axios.post(url, JSON.stringify(payload), { headers })

    return res.data.access_token;
  } catch (error) {
    console.error(error)
    return error;
  }
}

const getUsersByRoleId = async (roleId: string) => {
  try {
    const management = new ManagementClient({
      "domain": process.env.AUTH0_DOMAIN!,
      "clientId": process.env.AUTH0_USER_ADMIN_CLIENT_ID!,
      "clientSecret": process.env.AUTH0_USER_ADMIN_CLIENT_SECRET!,
      "scope": "read:users",
    });

    let page = 0;
    const per_page = 100;
    let total = 0;
    let users: any[] = [];

    while (page * per_page <= total) {
      const res = await management.getUsersInRole({
        include_totals: true,
        id: roleId,
        page,
        per_page
      });

      total = res.total;
      page = page + 1;
      
      users = [...users, ...res.users]
    }

    const json2csvParser = await new Parser();
    const csv = await json2csvParser.parse(users);

    fs.writeFileSync(`${__dirname}/../dumps/${Date.now()}_users_for_role_${roleId}.csv`, csv, 'utf8')

    return;

  } catch (error) {
    console.error(error)
    
  }
}

const getUsers = async () => {
  try {
    const management = new ManagementClient({
      "domain": process.env.AUTH0_DOMAIN!,
      "clientId": process.env.AUTH0_USER_ADMIN_CLIENT_ID!,
      "clientSecret": process.env.AUTH0_USER_ADMIN_CLIENT_SECRET!,
      "scope": "read:users",
    });

    let page = 0;
    const per_page = 100;
    let total = 0;
    let users: any[] = [];
    const q = `identities.connection=model-m-users AND (app_metadata.role_id: ${process.env.ROLE_ID_GUILD_SUPER_USER} OR app_metadata.role_id: ${process.env.ROLE_ID_GUILD_ADMIN} OR app_metadata.role_id: ${process.env.ROLE_ID_GUILD_MEMBER})`
    
    while (page * per_page <= total) {
      const res = await management.getUsers({
        include_totals: true,
        q,
        page,
        per_page
      });

      total = res.total;
      page = page + 1;
      
      users = [...users, ...res.users]
    }

    const usersForCsv = users.map(u => ({
      created_at: u.created_at,
      email: u.email,
      family_name: u.user_metadata.family_name,
      given_name: u.user_metadata.given_name,
      last_login: u.last_login,
      last_password_reset: u.last_password_reset,
      logins_count: u.logins_count,
      name: u.name,
      role_id: u.app_metadata.role_id,
      user_id: u.user_id
    }))

    const json2csvParser = await new Parser();
    const csv = await json2csvParser.parse(usersForCsv);

    fs.writeFileSync(`${__dirname}/../dumps/${Date.now()}_guild_users.csv`, csv, 'utf8')

    return;

  } catch (error) {
    console.error(error);
    return;
  }
}

// getUsers();
getUsersByRoleId(process.env.ROLE_ID_SPONSORSHIP as string)

