<template>
  <Feed :publisher="publisher"></Feed>
</template>

<script>
import { defineComponent } from "vue";
import Feed from "../pages/Feed.vue";

export default defineComponent({
  name: "Home",
  components: {
    Feed,
  },
  props: {
    publisher: {
      type: String,
      required: true,
    },
  },
  data: function () {
    return {};
  },
});
</script>
