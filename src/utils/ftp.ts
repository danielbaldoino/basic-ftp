import { Client } from 'basic-ftp'
import { randomBytes } from 'crypto'
import { UploadedFile } from 'express-fileupload'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

export type FtpOptions = {
  host: string
  user: string
  password: string
  path: string
  remotePath: string
  url: string
}

const ftpConnect = async (ftp: Client, options: FtpOptions): Promise<void> => {
  await ftp.access({
    host: options.host,
    user: options.user,
    password: options.password,
    secure: false,
    secureOptions: { timeout: 100000 },
  })

  await ftp.cd(options.path || '/')

  await ftp.cd(options.remotePath)
}

export const ftpUpload = async (
  file: UploadedFile,
  options: FtpOptions,
): Promise<string> => {
  try {
    const ftp = new Client()

    const name = `${randomBytes(8).toString('hex')}.${file.mimetype.split('/').pop()}`

    const tempFilePath = path.join(os.tmpdir(), name)

    try {
      await ftpConnect(ftp, options)

      await fs.writeFile(tempFilePath, file.data)

      const info = await ftp.uploadFrom(tempFilePath, name)

      console.info('File sent:', info)

      return `${options.url}/${options.remotePath}/${name}`
    } catch (error) {
      console.info(error)
    } finally {
      await fs.unlink(tempFilePath)
      ftp.close()
    }
  } catch (error) {
    console.info(error)
  }

  return null
}
