<template>
  <Feed :id="id"></Feed>
</template>

<script>
import Feed from "../pages/Feed.vue";
export default {
  name: "Home",
  components: {
    Feed
  },
  props: {
    id: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {};
  }
};
</script>
