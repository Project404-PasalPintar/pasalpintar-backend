<h1 align="center">Pasal Pintar Backend</h1>

<div align="center">

![Node.js](https://img.shields.io/badge/-Node.js-05122A?style=flat&logo=node.js)&nbsp;
![TypeScript.ts](https://img.shields.io/badge/-TypeScript.ts-05122A?style=flat&logo=typescript)&nbsp;
![Firebase](https://img.shields.io/badge/-Firebase-05122A?style=flat&logo=firebase)&nbsp;
![Zod](https://img.shields.io/badge/-Zod-05122A?style=flat&logo=zod)&nbsp;
![JWT](https://img.shields.io/badge/-JWT-05122A?style=flat&logo=auth0)&nbsp;
![OpenAPI Swagger](https://img.shields.io/badge/-OpenAPI%20Swagger-05122A?style=flat&logo=swagger)&nbsp;
![Postman](https://img.shields.io/badge/-Postman-05122A?style=flat&logo=postman)&nbsp;
![Google Cloud Platform](https://img.shields.io/badge/-Google%20Cloud%20Platform-05122A?style=flat&logo=googlecloud)&nbsp;

</div>

<p align="center">This repository is the backend for a mobile application that aims to provide various features such as authentication, chat, and more. This backend is built using TypeScript, Firebase, Zod, JWT, OpenAPI (Swagger), FireStore, and Cloud Storage</p>

## Running on Localhost

Clone the project

```
  git clone https://github.com/Project404-PasalPintar/pasalpintar-backend
```

1. Fix `eslint`

- Go to the project directory

```
cd pasalpintar-backend/functions
npm run lint -- --fix
```

- Create an .env file based on the env.example file

```
copy .env.example .env
```

> **NOTE:** if you use **Cloud Functions V1**
>
> - Add Firebase Env `Optional`
>
> ```
> firebase functions:config:set JWT_ACCESS_TOKEN_SECRET="YOUR_ACCESS_TOKEN_SECRET"
> firebase functions:config:set JWT_REFRESH_TOKEN_SECRET="YOUR_REFRESH_TOKEN_SECRET"
> ```
>
> - Check Firebase Env `Optional`
>
> ```
> firebase functions:config:get
> ```
>
> - Remove Env API.KEY Firebase `Optional`
>
> ```
> firebase functions:config:unset api.key
> ```

---

2. Deploy Cloud Functions

- Go to the project directory

```
cd pasalpintar-backend
```

- Deploy Cloud All Functions

```
firebase deploy --only functions
```

> Deploy Cloud Functions Depend On The Name `Optional`
>
> ```
> firebase deploy --only functions:auth,functions:session
> ```
