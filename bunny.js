!function (win) {
    "use strict";

    // 插件名称
    const appName = "bunny"

    /**
     * get请求组件
     * @param {string} url 连接
     * @param {number} timeout 时长,默认10s 10000
     * @returns template doc
     */
    async function getCompontent(url, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = response.text()
                .then(html => new DOMParser().parseFromString(html, 'text/html'));
            return (await html).querySelector("template")
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out.');
            } else {
                throw error;
            }
        }
    }

    /**
     * get请求json
     * @param {string} url 
     * @param {number} timeout 
     * @returns 
     */
    async function getJson(url, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json()
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out.');
            } else {
                throw error;
            }
        }
    }

    /**
     * 匹配路由
     * @param {string} a 路由
     * @param {string} b 要匹配的路由
     * @returns 
     */
    function matchAndExtract(a, b) {
        if (a === b) {
            return true;
        }
        const placeholders = b.match(/{([^}]+)}/g);
        if (!placeholders) {
            return false;
        }
        const regex = b.replace(/{([^}]+)}/g, '(\\w+)');
        const match = a.match(new RegExp(regex));
        if (match) {
            const extractedData = {};
            for (let i = 0; i < placeholders.length; i++) {
                const placeholderName = placeholders[i].slice(1, -1);
                extractedData[placeholderName] = match[i + 1];
            }
            return extractedData;
        } else {
            return false;
        }
    }

    /**
     * 检测标签名
     * @param {string} str 标签名
     * @returns bool
     */
    function checkString(str) {
        const regex = /^[a-z].*-.*/;
        return regex.test(str);
    }

    function url() {
        const fullHash = win.location.hash.substring(1);
        let targetHash;
        if (fullHash.indexOf('#') > -1) {
            targetHash = fullHash.substring(1, fullHash.indexOf('#', 1)) || "/";
        } else {
            targetHash = fullHash.substring(1) || "/";
        }
        let data = {
            href: win.location.href.replace(win.location.origin, ""),
            hash: {
                href: targetHash
            }
        }
        if (!targetHash.startsWith("/")) {
            data.hash.href = "/" + targetHash
        }
        if (targetHash === "/") {
            data.hash.path = ["home"]
        } else {
            data.hash.path = targetHash.split("/")
        }
        return data
    }

    /**
     * 路由组件
     */
    class RouteComponent {
        constructor(shadow, template) {
            this.params = {} //接收的参数
            this.query = {} //接收的请求
            this.shadow = shadow.attachShadow({ mode: "open" })
            this.template = template.content
            // 初次更新
            this.updateShadow()
            // 监听属性来改变接收参数和请求
            this.observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' &&
                        ["params", "query"].some(element => element.includes(mutation.attributeName))) {
                        // 未完待续。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。。
                        this.clearShadow()
                        this.updateShadow()
                    }
                }
            })
        }

        // 更新所有内容
        updateShadow() {
            for (const value of this.template.childNodes.values()) {
                if (value.nodeName !== "SCRIPT") {
                    this.shadow.appendChild(value.cloneNode(true));
                } else {
                    const fn = new Function('doc,params,query',
                        `(function(document,params,query) {
                            "use strict";
                            ${value.textContent}
                        })(doc,params,query)`)
                    fn(this.shadow, this.params, this.query)
                }
            }
        }

        // 清空所有内容
        clearShadow() {
            while (this.shadow.firstChild) {
                this.shadow.removeChild(this.shadow.firstChild);
            }
        }
    }

    // 注册入口组件
    customElements.define(`${appName}-main`, class extends HTMLElement {
        constructor() {
            super()
            // 缓存信息
            this.cache = {
                route: {}, // {"/":"name",...}
                template: {} // {"name":tpl,...}    
            }
            // 当前doc
            this.shadow = this.attachShadow({ mode: "open" })

            // 创建路由
            this.buildRoute()

            // 监听hash变化
            win.addEventListener('hashchange', async () => {
                this.navigate()
            })
        }

        /**
         * 路由存储
         */
        async buildRoute() {
            const routeJson = await getJson("/route.json")
            for (const value of routeJson) {
                const div = document.createElement("div")
                div.setAttribute("route-name", value.name)
                div.setAttribute("style", "display:none;")
                this.shadow.append(div)
                this.cache.template[value.name] = {
                    path: value.path,
                    dom: new RouteComponent(div, await getCompontent(value.page))
                }
            }
            console.log(this.cache)
            this.navigate()
        }

        /**
         * 导航
         */
        navigate() {
            this.shadow.querySelector("div[route-name]")
                .style.display = "none"
            let thisUrl = url()

            console.log(thisUrl)
            /* this.shadow.querySelector("div[route-name]")
                .style.display = "none"
            this.shadow.querySelector(`div[route-name="${name}"]`)
                .style.display = "block" */
        }

        /**
         * 更新模板内容
         * @param {template} tpl 模板内容
         */
        /* async updateShadow(tpl) {
            for (const value of tpl.childNodes.values()) {
                if (value.nodeName !== "SCRIPT") {
                    this.shadow.appendChild(value.cloneNode(true));
                } else {
                    const fn = new Function('doc,component',
                        `(function(document,component) {
                        "use strict";
                        ${value.textContent}
                    })(doc,component)`)
                    fn(this.shadow, this.component)
                }
            }
        } */

        // 清空所有内容
        /* async clearShadow() {
            while (this.shadow.firstChild) {
                this.shadow.removeChild(this.shadow.firstChild);
            }
        } */

        // 实例化组件
        /* component(tagName) {
            if (typeof tagName === "string") {
                tagName = [tagName]
            }
            for (const val of tagName) {
                if (!checkString(val)) {
                    throw new Error(`The key '${val}' must start with a lowercase letter and contain a hyphen.`)
                }
                const tpl = getCompontent(`/component/${val}.html`)
                customElements.define(val, class extends HTMLElement {
                    constructor() { 
                        super()
                    }
                })
            }
        } */

    });
}(window);