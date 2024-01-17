import { Client } from 'basic-ftp'
import { File } from 'buffer'
import cors from 'cors'
import express from 'express'
import fs from 'fs/promises'
import multer from 'multer'
import os from 'os'
import path from 'path'

export const app = express()

app.use(cors({ origin: true }))

app.use(express.json())
app.use(express.raw({ type: 'application/vnd.custom-type' }))
app.use(express.text({ type: 'text/html' }))

const storage = multer.memoryStorage()
const upload = multer({ storage })

app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' })
})

app.post('/', upload.single('file'), async (req, res) => {
  const { file, remotePath } = req.body as { file: File; remotePath: string }

  const name = `${Math.random().toString(36).slice(-8)}.${file.type.split('/')[1]}`

  const tempStoragePath = path.join(os.tmpdir(), name)

  const buffer = Buffer.from(await file.arrayBuffer())

  const ftp = new Client()

  try {
    await fs.writeFile(tempStoragePath, buffer)

    await ftp.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
      secureOptions: { timeout: 100000 },
    })

    await ftp.cd(process.env.FTP_PATH || '/')

    await ftp.cd(remotePath)

    const info = await ftp.uploadFrom(tempStoragePath, name)

    console.info('File sent:', info)

    const url = `${process.env.FTP_URL}/${remotePath}/${name}`

    res.status(200).send({ url })
  } catch (error) {
    console.error('Error Uploading File:', error)

    res.status(500).send(error)
  } finally {
    await fs.unlink(tempStoragePath)

    ftp.close()
  }
})

app.delete('/', async (req, res) => {
  const { url } = req.body as { url: string }

  const ftp = new Client()

  try {
    ftp.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
      secureOptions: { timeout: 100000 },
    })

    await ftp.cd(process.env.FTP_PATH || '/')

    const path = url.replace(`${process.env.FTP_URL}/`, '')

    const info = await ftp.remove(path)

    res.status(200).send(info)
  } catch (error) {
    console.error('Error Deleting File:', error)

    res.status(500).send(error)
  } finally {
    ftp.close()
  }
})
