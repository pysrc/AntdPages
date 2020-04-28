import React from 'react';

import { Tag, Layout, Menu, Modal, Input, PageHeader, Button, Drawer, List, message, Badge, BackTop, Pagination } from 'antd';

import { HomeOutlined, SearchOutlined, SettingOutlined, ShareAltOutlined, GithubOutlined } from '@ant-design/icons';

import marked from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import $ from 'jquery';

import axios from 'axios';

import * as CryptoJS from 'crypto-js';
import md5 from 'md5';


const {Content, Sider, Footer} = Layout;
const {SubMenu} = Menu;
const {Search} = Input;
let alls = null;
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  highlight: function(code) {
    return hljs.highlightAuto(code).value;
  },
});

class App extends React.Component {
  state = {
    collapsed: false,
    visible: false,
    art_pwd: null,
    title: "",
    tags: [],
    right_show: false,
    md_html: '', // markdown的Html
    aes_iv: "", // AES iv
    aes_key: "", // AES key
    mds: [], // 搜索列表
  };

  constructor(props) {
    super(props);
	axios.get("./config/config.xml")
    .then(res => {
    	const parser=new DOMParser();
    	const dom = parser.parseFromString(res.data, "text/xml");
    	let mds = dom.getElementsByTagName("markdown");
    	console.log(mds);
    	alls = mds;
    	this.setState({
    		mds: mds
    	});
    	this.open(this.state.mds[0]);
    });
  }

  search = (key) => {
    var res = [];
    for (var i = 0; i < alls.length; i++) {
      var title = this.title(alls[i]);
      var tgs = this.tags(alls[i]);
      if ((tgs.join("") + title).toUpperCase().indexOf(key.toUpperCase()) !== -1) {
        res.push(alls[i]);
      }
    }
    this.setState({
      "mds": res
    });
  }

  tags = (item) => {
  	const ts = item.getElementsByTagName("tag");
  	let res = [];
  	for(let i = 0; i < ts.length; i++){
  		res.push(ts[i].textContent)
  	}
  	return res;
  }

  isPublic = (item) => {
  	return item.getElementsByTagName("public").item(0).textContent === "true";
  }

  title = (item) => {
  	return item.getElementsByTagName("title").item(0).textContent;
  }

  // 打开文章
  open = (item) => {
    // 关闭遮罩
    this.onClose();
    const dir = "./mds/";
    var title = this.title(item);
    var isPublic = this.isPublic(item);
    if (isPublic === false && (null === this.state.aes_key || "" === this.state.aes_key)) {
      message.error("请设置查看密钥！");
      return;
    }
    var parse = (title, data) => {
      var path = title.replace("*", "\\*").replace("+", "\\+");
      // 将markdown中的资源地址替换为真实的网址
      var re = new RegExp("\\[(.*?)\\]\\((" + path + "\\/.*?)\\)", "g");
      var text = data.replace(re, "[$1](" + dir + "$2)");
      var html = $('<div>' + marked(text) + '</div>');
      // 将代码块背景美化一下
      html.children("pre").each(function(i, block) {
        hljs.highlightBlock(block);
      });
      this.setState({
        "title": title,
        "tags": this.tags(item),
        "md_html": html.prop("outerHTML")
      });
    }
    axios.get(dir + title + '.en')
      .then(res => {
        if (isPublic) {
          parse(title, res.data);
        } else {
          var txt = res.data.replace(/^0*/, "");
          var encryptedHexStr = CryptoJS.enc.Hex.parse(txt);
          var encryptedBase64Str = CryptoJS.enc.Base64.stringify(encryptedHexStr);
          try {
            var data = CryptoJS.AES.decrypt(encryptedBase64Str, this.state.aes_key, {
              iv: this.state.aes_iv,
              mode: CryptoJS.mode.CBC,
              padding: CryptoJS.pad.Pkcs7
            }).toString(CryptoJS.enc.Utf8);
          } catch ( e ) {
            console.log(e);
            message.error("查看密钥错误！");
            return;
          }
          parse(title, data);
        }
      });
  }

  showDrawer = () => {
    this.setState({
      right_show: true,
    });
  };

  onClose = () => {
    this.setState({
      right_show: false,
    });
  };

  onCollapse = collapsed => {
    this.setState({
      collapsed
    });
  };

  showModal = () => {
    this.setState({
      visible: true,
    });
  };

  handleOk = e => {
    // AES私钥
    var pwd = md5(this.state.art_pwd);
    this.setState({
      visible: false,
      aes_key: CryptoJS.enc.Utf8.parse(pwd.substr(0, 16)),
      aes_iv: CryptoJS.enc.Utf8.parse(pwd.substr(16, 16)),
      art_pwd: null
    });
  };

  handleCancel = e => {
    this.setState({
      visible: false,
    });
  };

  render() {
    return (
      <Layout style={ { minHeight: '100vh' } }>
        <Sider
          collapsible
          collapsed={ this.state.collapsed }
          onCollapse={ this.onCollapse }>
          <div className="logo" />
          <Menu
            theme="dark"
            defaultSelectedKeys={ ['home'] }
            mode="inline">
            <Menu.Item
              key="home"
              onClick={ () => {
                          this.open(alls[0])
                        } }>
              <HomeOutlined />
              <span>首页</span>
            </Menu.Item>
            <Menu.Item
              key="left"
              onClick={ this.showDrawer }>
              <SearchOutlined />
              <span>文章列表</span>
            </Menu.Item>
            <SubMenu
              key="set"
              title={ <span><SettingOutlined /> <span>设置</span></span> }>
              <Menu.Item
                key="show-pwd"
                onClick={ this.showModal }>
                密钥设置
              </Menu.Item>
            </SubMenu>
            <SubMenu
              key="friends"
              title={ <span><ShareAltOutlined /> <span>网站精选</span></span> }>
              <Menu.Item key="pyc">
                <a
                  href="https://github.com/pysrc"
                  rel="noopener noreferrer"
                  target="_blank"><GithubOutlined />Author</a>
              </Menu.Item>
            </SubMenu>
          </Menu>
        </Sider>
        <Layout>
          <PageHeader
            title={ this.state.title }
            tags={ this.state.tags.map((tag) => <Tag
                                                  color="red"
                                                  key={ tag }>
                                                  { tag }
                                                </Tag>
                   ) } />
          <Content style={ { margin: '0 16px' } }>
            <div style={ { padding: 24, background: '#fff', minHeight: 360 } }>
              <div
                id="markdown"
                dangerouslySetInnerHTML={ { __html: this.state.md_html, } } />
              <div>
                <Modal
                  title="密钥设置"
                  visible={ this.state.visible }
                  onOk={ this.handleOk }
                  onCancel={ this.handleCancel }
                  okText="确认"
                  cancelText="取消">
                  <div style={ { marginBottom: 16 } }>
                    <Input.Password
                      placeholder="笔记密钥"
                      value={ this.state.art_pwd }
                      onChange={ e => this.setState({
                                   "art_pwd": e.target.value
                                 }) }
                      onPressEnter={ () => this.handleOk(null) } />
                  </div>
                </Modal>
              </div>
            </div>
            <div>
              <Drawer
                title="文章搜索"
                placement="right"
                width={ 400 }
                closable={ false }
                onClose={ this.onClose }
                visible={ this.state.right_show }>
                <Search
                  placeholder="关键字"
                  onSearch={ value => this.search(value) }
                  enterButton />
                <List
                  itemLayout="horizontal"
                  dataSource={ this.state.mds }
                  renderItem={ item => (
                                 <List.Item>
                                   <Badge
                                     color={ this.isPublic(item) ? 'green' : 'red' }
                                     text={ this.isPublic(item) ? '公开' : '加密' } />
                                   <Button
                                     type="link"
                                     onClick={ (e) => this.open(item) }>
                                     { this.title(item) }
                                   </Button>
                                 </List.Item>
                               ) } />
              </Drawer>
            </div>
            <div>
              <BackTop />
            </div>
            <div>
              <Pagination
                simple
                defaultCurrent={ 1 }
                total={ this.state.mds.length * 10 }
                onChange={ pageNum => this.open(this.state.mds[pageNum - 1]) } />
            </div>
          </Content>
          <Footer style={ { textAlign: 'center' } }>
            Gocore @ Created by L.Chen
          </Footer>
        </Layout>
      </Layout>
      );
  }
}


export default App;