import Vue from "vue";
import VueRouter from "vue-router";
import Feed from "../pages/Feed.vue";
import PostList from "../pages/PostList.vue";
import Post from "../pages/Post.vue";
import IdentityList from "../pages/IdentityList.vue";
import Identity from "../pages/Identity.vue";
import MetaList from "../pages/MetaList.vue";
import Meta from "../pages/Meta.vue";
import Settings from "../pages/Settings.vue";

const routes = [
  // {
  //   path: "/",
  //   component: () => import("layouts/MainLayout.vue"),
  //   children: [{ path: "", component: () => import("pages/Index.vue") }]
  // },

  {
    path: "/",
    redirect: "/feed",
    name: "home",
    component: Feed,
    // props: true,
    children: [
      {
        path: "feed" /* changed */,
        name: "Feed"
        // component: Feed
        // props: true
      }
    ]
  },
  {
    path: "/posts",
    name: "PostList",
    component: PostList,
    props: true
  },
  {
    path: "/post",
    name: "Post",
    component: Post,
    props: true
  },
  {
    path: "/identities",
    name: "IdentityList",
    component: IdentityList,
    props: true
  },
  {
    path: "/identity",
    name: "Identity",
    component: Identity,
    props: true
  },
  {
    path: "/connections",
    name: "MetaList",
    component: MetaList,
    props: true
  },
  {
    path: "/collection",
    name: "Meta",
    component: Meta,
    props: true
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings
  },
  {
    path: "*",
    component: () => import("pages/Error404.vue")
  }
];

Vue.use(VueRouter);
/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

const Router = new VueRouter({
  scrollBehavior: () => ({ x: 0, y: 0 }),
  routes,

  // Leave these as they are and change in quasar.conf.js instead!
  // quasar.conf.js -> build -> vueRouterMode
  // quasar.conf.js -> build -> publicPath
  mode: process.env.VUE_ROUTER_MODE,
  base: process.env.VUE_ROUTER_BASE
});

export default Router;
