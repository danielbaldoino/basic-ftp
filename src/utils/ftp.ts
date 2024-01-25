import { Client } from 'basic-ftp'
import { randomBytes } from 'crypto'
import { UploadedFile } from 'express-fileupload'

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

    try {
      await ftpConnect(ftp, options)

      const info = await ftp.uploadFrom(file.tempFilePath, name)

      console.info('File sent:', info)

      return `${options.url}/${options.remotePath}/${name}`
    } catch (error) {
      console.info(error)
    } finally {
      ftp.close()
    }
  } catch (error) {
    console.info(error)
  }

  return null
}
