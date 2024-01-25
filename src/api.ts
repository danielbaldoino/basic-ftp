import cors from 'cors'
import express from 'express'
import fileUpload from 'express-fileupload'
import jwt from 'jsonwebtoken'
import { FtpOptions, ftpUpload } from './utils/ftp'

export const app = express()

app.use(cors({ origin: true }))

app.use(express.json())
app.use(express.raw({ type: 'application/vnd.custom-type' }))
app.use(express.text({ type: 'text/html' }))

app.use(fileUpload({ limits: { files: 1, fileSize: 50 * 1024 * 1024 } }))

const verifyCredential = (req, res, next) => {
  const credential = req.query.credential

  if (!credential) {
    return res.status(403).json({ error: 'Credential not provided' })
  }

  jwt.verify(credential, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Credential invalid' })
    }

    console.log(decoded)

    req.decoded = decoded
    next()
  })
}

app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' })
})

app.post('/signed-url', (req, res) => {
  if (req.headers.api_key !== process.env.API_KEY) {
    res.status(401).send({ error: 'Unauthorized' })
    return
  }

  const { host, password, user, path, remotePath, url } = req.body

  if (!host || !password || !user) {
    res.status(400).send({ error: 'Bad request' })
    return
  }

  const credential = { host, password, user, path, remotePath, url }

  const signedJwt = jwt.sign(credential, process.env.SECRET_KEY, {
    expiresIn: '1m',
  })

  const signedUrl =
    'https://' + req.get('host') + '/upload?credential=' + signedJwt

  res.json(signedUrl)
})

app.post('/upload', verifyCredential, async (req, res) => {
  const file = req.files.file as fileUpload.UploadedFile

  if (!file) {
    res.status(400).send({ error: 'No file provided' })
    return
  }

  const options = req.body as FtpOptions

  if (!options) {
    res.status(400).send({ error: 'No options provided' })
    return
  }

  try {
    const url = await ftpUpload(file, { ...options, ...(req as any).decoded })

    if (url) {
      res.status(200).send({ url })
    } else {
      res.status(500).send({ error: 'Something went wrong' })
    }
  } catch (error) {
    res.status(500).send({ error })
  }
})
