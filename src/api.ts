import cors from 'cors'
import express from 'express'
import fileUpload from 'express-fileupload'
import { FtpOptions, ftpUpload } from './utils/ftp'

export const app = express()

app.use(cors({ origin: true }))

app.use(express.json())
app.use(express.raw({ type: 'application/vnd.custom-type' }))
app.use(express.text({ type: 'text/html' }))

app.use(fileUpload({ limits: { files: 1, fileSize: 50 * 1024 * 1024 } }))

app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' })
})

app.post('/', async (req, res) => {
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
    const url = await ftpUpload(file, options)

    if (url) res.status(200).send({ url })

    res.status(500).send({ error: 'Something went wrong' })
  } catch (error) {
    res.status(500).send({ error })
  }
})
