package main

import (
	"bufio"
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"os"
	"regexp"
)

const (
	MdDefine = "config/config.xml" // Markdown配置文件路径
	MdDir    = "mds/"              // Markdown文件夹
)

const fmtvar = `<!-- next -->
<markdown>
<title>%s</title>
<public>%s</public>
<tags>%s</tags>
</markdown>`

type Markdowns struct {
	XMLName xml.Name   `xml:"markdowns"`
	Marks   []Markdown `xml:"markdown"`
}
type Markdown struct {
	Title  string   `xml:"title"`
	Public string   `xml:"public"`
	Tags   []string `xml:"tags>tag"`
}

//使用PKCS7进行填充
func PKCS7Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - len(ciphertext)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

//aes加密，填充秘钥key的16位，24,32分别对应AES-128, AES-192, or AES-256.
func AesCBCEncrypt(rawData, key, iv []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		panic(err)
	}

	//填充原文
	blockSize := block.BlockSize()
	rawData = PKCS7Padding(rawData, blockSize)
	//初始向量IV必须是唯一，但不需要保密
	cipherText := make([]byte, blockSize+len(rawData))

	//block大小和初始向量大小一定要一致
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(cipherText[blockSize:], rawData)

	return cipherText, nil
}

func EncryptToHexString(rawData, key, iv []byte) (string, error) {
	s, err := AesCBCEncrypt(rawData, key, iv)
	// return strings.TrimLeft(hex.EncodeToString(s), "0"), err
	return hex.EncodeToString(s), err
}

func add(md []byte) []byte {
	var title, pub, tags string
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Title(u: 不添加新文章)>>")
	in, _, _ := reader.ReadLine()
	title = string(in)
	if title == "u" {
		return md
	}
	fmt.Print("Public>>")
	in, _, _ = reader.ReadLine()
	pub = string(in)
	fmt.Print("Tags(<tag>Java</tag><tag>etc.</tag>)>>")
	in, _, _ = reader.ReadLine()
	tags = string(in)
	re := regexp.MustCompile(`<!-- next -->`)
	res := re.ReplaceAll(md, []byte(fmt.Sprintf(fmtvar, title, pub, tags)))
	ioutil.WriteFile(MdDefine, res, 0666)
	return res
}

func main() {
	mds, _ := ioutil.ReadFile(MdDefine)
	mds = add(mds)
	var md Markdowns
	xml.Unmarshal(mds, &md)
	var pwd string // 密码
	fmt.Print("Passwd>>")
	fmt.Scanf("%s\n", &pwd)
	md5s := fmt.Sprintf("%x", md5.Sum([]byte(pwd)))
	key := []byte(md5s[:16])
	iv := []byte(md5s[16:])
	for _, v := range md.Marks {
		md, _ := ioutil.ReadFile(MdDir + v.Title + ".md")
		if v.Public == "true" {
			ioutil.WriteFile(MdDir+v.Title+".en", md, 0644)
			continue
		}
		en, _ := EncryptToHexString(md, key, iv)
		ioutil.WriteFile(MdDir+v.Title+".en", []byte(en), 0644)
	}
}
