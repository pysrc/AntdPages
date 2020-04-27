package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io/ioutil"
)

const (
	MdDir = "mds/" // Markdown文件夹
)

func PKCS7UnPadding(origData []byte) []byte {
	length := len(origData)
	unpadding := int(origData[length-1])
	return origData[:(length - unpadding)]
}

func AesCBCDncrypt(encryptData, key, iv []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		panic(err)
	}

	blockSize := block.BlockSize()

	if len(encryptData) < blockSize {
		panic("ciphertext too short")
	}
	// iv := encryptData[:blockSize]
	encryptData = encryptData[blockSize:]

	// CBC mode always works in whole blocks.
	if len(encryptData)%blockSize != 0 {
		panic("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)

	// CryptBlocks can work in-place if the two arguments are the same.
	mode.CryptBlocks(encryptData, encryptData)
	//解填充
	encryptData = PKCS7UnPadding(encryptData)
	return encryptData, nil
}

func GetKeyIv(pwd string) ([]byte, []byte) {
	has := md5.Sum([]byte(pwd))
	pwd = fmt.Sprintf("%x", has)
	return []byte(pwd[:16]), []byte(pwd[16:])
}

func main() {
	var pwd, file string
	fmt.Print("Title>>")
	fmt.Scanf("%s\n", &file)
	fmt.Print("Password>>")
	fmt.Scanf("%s\n", &pwd)

	if file != "" {
		bts, err := ioutil.ReadFile(MdDir + file + ".en")
		if err != nil {
			fmt.Println(err)
			return
		}
		k, i := GetKeyIv(pwd)
		en, err := hex.DecodeString(string(bts))
		if err != nil {
			fmt.Println(err)
			return
		}
		btsr, err := AesCBCDncrypt(en, k, i)
		if err != nil {
			fmt.Println(err)
			return
		}
		if err != nil {
			fmt.Println(err)
			return
		}
		ioutil.WriteFile(file+".md", btsr, 0644)
	}
}
