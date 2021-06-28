const routes = [
  {
    path: "/",
    redirect: "/feed",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        component: () => import("pages/Feed.vue"),
        path: "",
        name: "Feed",
        props: true,
      },
    ],
  },
  {
    path: "/post",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        component: () => import("pages/Post.vue"),
        path: "",
        name: "Post",
        props: true,
      },
    ],
  },
  {
    path: "/identity/:publisher",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        component: () => import("pages/Identity.vue"),
        path: "",
        name: "Identity",
        props: true,
      },
    ],
  },
  {
    path: "/collection/:publisher",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        component: () => import("pages/Meta.vue"),
        path: "",
        name: "Meta",
        props: true,
      },
    ],
  },
  {
    path: "/settings",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        component: () => import("pages/Settings.vue"),
        path: "",
        name: "Settings",
        props: true,
      },
    ],
  },
  {
    path: "/:catchAll(.*)*",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        component: () => import("pages/Error404.vue"),
        path: "",
        name: "Error404",
        props: true,
      },
    ],
  },
];

export default routes;
