<template>
  <Feed :publisher="publisher"></Feed>
</template>

<script>
import Feed from "../pages/Feed.vue";
export default {
  name: "Home",
  components: {
    Feed
  },
  props: {
    publisher: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {};
  }
};
</script>
