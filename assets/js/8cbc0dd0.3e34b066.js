"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[601],{3952:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>c,default:()=>h,frontMatter:()=>s,metadata:()=>o,toc:()=>l});var r=t(4848),i=t(8453);const s={},c="Code generation",o={id:"generation",title:"Code generation",description:"graphql-magic generates a lot of utility code for you based on the models, in particular typescript types.",source:"@site/docs/4-generation.md",sourceDirName:".",slug:"/generation",permalink:"/graphql-magic/docs/generation",draft:!1,unlisted:!1,tags:[],version:"current",sidebarPosition:4,frontMatter:{},sidebar:"sidebar",previous:{title:"Fields",permalink:"/graphql-magic/docs/fields"},next:{title:"Migrations",permalink:"/graphql-magic/docs/migrations"}},d={},l=[];function a(e){const n={code:"code",h1:"h1",header:"header",li:"li",p:"p",pre:"pre",ul:"ul",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"code-generation",children:"Code generation"})}),"\n",(0,r.jsxs)(n.p,{children:[(0,r.jsx)(n.code,{children:"graphql-magic"})," generates a lot of utility code for you based on the models, in particular typescript types."]}),"\n",(0,r.jsxs)(n.p,{children:["This can be done directly with ",(0,r.jsx)(n.code,{children:"npx gqm generate"}),"."]}),"\n",(0,r.jsx)(n.p,{children:"During the first run, the tool applies the following changes to the repo:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Generate ",(0,r.jsx)(n.code,{children:".gqmrc.json"})," file."]}),"\n",(0,r.jsxs)(n.li,{children:["Add local database connection variables to ",(0,r.jsx)(n.code,{children:".env"})," file."]}),"\n",(0,r.jsxs)(n.li,{children:["Add generated folder to ",(0,r.jsx)(n.code,{children:".gitignore"})]}),"\n",(0,r.jsxs)(n.li,{children:["Generate ",(0,r.jsx)(n.code,{children:"models.ts"})," file (if not present)."]}),"\n",(0,r.jsxs)(n.li,{children:["Generate a basic ",(0,r.jsx)(n.code,{children:"get-me.ts"})," example graphql query."]}),"\n",(0,r.jsxs)(n.li,{children:["Generate the ",(0,r.jsx)(n.code,{children:"execute.ts"})," file for the execution"]}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:'With each application, it generates the following files in the configured "generated" folder:'}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"schema.graphql"})," - the schema of the api, for reference"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"models.json"}),' - the final models array, including generated fields such as "id","createdBy"... for reference']}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"api/index.ts"})," - the server-side model typescipt types"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"client/index.ts"})," - the client-side typescript types for the provided queries"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"client/mutations.ts"})," - standard mutation queries for all models"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"db/index.ts"})," - types for data from/to the database"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"db/knex.ts"})," - types to extend the ",(0,r.jsx)(n.code,{children:"knex"})," query builder"]}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["Whenever the models have been changed, it is necessary regenerate this code.\nIt is recommended to create a ",(0,r.jsx)(n.code,{children:"package.json"})," script and to always generate code after install (or with ",(0,r.jsx)(n.code,{children:"npm run generate"}),"):"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:'"scripts": {\n    "bootstrap": "npm ci && npm run generate",\n    "generate": "gqm generate"\n}\n'})})]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(a,{...e})}):a(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>c,x:()=>o});var r=t(6540);const i={},s=r.createContext(i);function c(e){const n=r.useContext(s);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:c(e.components),r.createElement(s.Provider,{value:n},e.children)}}}]);