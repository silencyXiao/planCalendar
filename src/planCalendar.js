;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    root.PlanCalendar = factory(root.jQuery);
  }
})(this ? this : window, function($) {
  class PlanCalendar {
    constructor(elem, options = {}) {
      const defaults = {
        monthNum: 4, // Number 默认值 4，月份显示个数
        sellOutText: '售罄', // String 默认值 '售罄'，余位为0时显示文字
        isTips: false, // Boolean 默认值 false，是否显示提示层 
        maxNum: 20, // Number  默认值 20，大于等于指定余位显示 maxNumText 的值
        maxNumText: '充足', // String  默认值 '充足'，配置大于等于指定余位显示文字
        markDates: [], // Array  默认值 []， 格式化好的团期数据        
        onSelect: function (dateItem, dataIndex) { // 选择团期之后的回调，dateItem：选中日期项, data[Array]: 团期数据
        },
        initTips: function (dataIndex) { // 初始化tips文档内容，data: 选中日期的团期数据，只选一个团期
          // return String 文档内容
        }

      };
      for (var i in defaults) {
        if (typeof options[i] === 'undefined') {
          options[i] = defaults[i];
        } else if (typeof options[i] === 'object') {
          for (var j in options[i]) {
            if (typeof options[i][j] === 'undefined') {
              options[i][j] = defaults[i][j];
            }
          }
        }
      }

      this.options = options;
      this.data = this.options.markDates.map((curVal) => {
        // 格式化出团日期
        for (let key in curVal) {
          if (key === 'date') {
            curVal[key] = this.formatDate(curVal.date);
          }
        }
        return curVal;
      });
      this.options.monthNum = this.options.monthNum > 11 ? 11 : this.options.monthNum; // 选项卡个数不能超过11个
      // 已选日期
      this.selectedDate = undefined;
      // 日历dom结构
      this.$cal = $(elem);
      this.$cal.html('<ul class="calendar-month"> </ul> <ul class="calendar-week"> <li>日</li> <li>一</li> <li>二</li> <li>三</li> <li>四</li> <li>五</li> <li>六</li> </ul> <ul class="calendar-date"> </ul>');
      this.$calMonth = this.$cal.children('.calendar-month');
      this.$calDate = this.$cal.children('.calendar-date');
      this.weekCn = ['日', '一', '二', '三', '四', '五', '六'];
      // 获取当前时间
      const now = new Date();
      const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];

      this.getCalMonth(y, m, this.options.monthNum);
      this.getCalDate(y, m, d);

      const that = this;
      this.$calMonth.on('click', 'li', function () {
        $(this).addClass('active')
          .siblings()
          .removeClass('active');
        let index = $(this).index();
        let yy = m + index > 11 ? (y + 1) : y;
        let mm = m + index > 11 ? (m - 12 + index) : (m + index);
        that.getCalDate(yy, mm);
      });
      this.$calDate.on('click', 'li.enabled', function () {
        that.selectCalDate(this, that.options.onSelect);
      });
    }
    /**
     * 格式化化日
     * 统一返回： YY-MM-DD
     */
    formatDate(...date) {
      if (typeof date[0] === 'string' && date[0].indexOf('-') !== -1 && date[0].length === 8) {
        return date[0];
      }
      const t = date.length === 3 ? new Date(date[0], date[1], date[2]) : new Date(date[0]);
      let m = (t.getMonth() + 1) < 10 ? ('0' + (t.getMonth() + 1)) : (t.getMonth() + 1);
      let d = t.getDate() < 10 ? ('0' + t.getDate()) : t.getDate();
      const dates = [t.getFullYear(), m, d];

      return dates.join('-');
    }
    /**
     * 获取指定日期指定天数之后的结束日期
     * @param {* string} date 开始日期 yy-mm-dd
     * @param {* number} days 天数
     */
    getEndDate(date, days) {
      const t = new Date(date);
      return this.formatDate(t.getFullYear(), t.getMonth(), t.getDate() + days);
    }
    /**
     * 获取指定月下在团期数据中的价格最小值，
     * 若该月无团则显示为“无团期”
     */
    getMinPrice(year, month) {
      if (this.data.length === 0) {
        return '<p class="none">无团期</p>';
      }
      const prices = this.data.filter((curVal) => {
        return (curVal.date.split('-')[0] == year &&
          parseInt(curVal.date.split('-')[1]) == month)
      });
      if (prices.length === 0) {
        return '<p class="none">无团期</p>';
      }
      const minPrice = prices.map((curVal) => {
        return curVal.price;
      }).sort((a, b) => {
        return a - b;
      })[0];
      
      let priceHtml = minPrice ?
        `<p class="price">&yen;${minPrice}起</p>` :
        `<p class="price">未设置</p>`
      return priceHtml;
    }
    /**
     * 渲染日期项中的团期数据
     * @param {* object}  jQuery 对象，日历表格项
     * @param {* number} year 当前年份
     * @param {* number} month 当前月份
     * @param {* number} date 当前日期
     */
    renderPlanData($item, year, month, date) {
      let curDate = this.formatDate(year, month, date); 
      const op = this.options;
      const toNumTxt = (number) => {
        if (number < op.maxNum) {
          return '余：' + number;
        } else if (number >= op.maxNum) {
          return op.maxNumText;
        } else {
          return '';
        }
      };
      const repeatDates = []; // 存储被移除的重复日期
      const uniqueData = []; // 存储被去重后的数据
      const dates = []; // 创建一个中间数组存储日期
      // 先按照余位数量从大到小对数组进行排序，
      // 使数组去重将取余位最大的数据
      this.data.sort((a, b) => {
        return b.number - a.number;
      })
      .forEach((curVal) => {
        let planDate = curVal.date;
        if (dates.indexOf(planDate) === -1) {
          dates.push(planDate);
          uniqueData.push(curVal);
        } else {
          repeatDates.push(curVal.date);
        }
      });
      // 输出对应日期的团期数据
      uniqueData.forEach((curVal, i) => {
        let planDate = curVal.date;
        if (planDate === curDate) {
          let priceHtml = typeof curVal.price === 'undefined' 
            ? '' 
            : `<p class="price">&yen;${curVal.price}起</p>`;
          let dataHtml = `${ priceHtml }<p class="number">${ toNumTxt(curVal.number) }</p>`;

          $item.addClass('enabled')
            .attr('data-start', planDate)
            .attr('data-end', this.getEndDate(curVal.date, curVal.days))
            .append(dataHtml);
          if (planDate === this.selectedDate) {
            $item.addClass('selected');
          }
          if (repeatDates.indexOf(curDate) !== -1) {
            $item.append(`<i class="badge">多团</i>`);
          }
          if (typeof curVal.number !== 'undefined' && curVal.number === 0) {
            $item.append(`<i class="badge">${this.options.sellOutText}</i>`);
          }
          if (this.options.isTips && this.options.initTips !== 'undefined' && !$item.hasClass('invalid')) {
            $item.append(this.options.initTips(curVal));
          }
        }
      });
    }
    /**
     * 渲染网格中的日期
     * @param {* object}  jQuery 对象，日历表格项
     * @param {* number} year 当前年份
     * @param {* number} month 当前月份
     * @param {* number} date 当前日期
     */
    renderCalDate($item, year, month, date) {
      $item.attr('data-date', () => {
          return this.formatDate(year, month, date);
        })
        .attr('data-week', () => {
          return this.weekCn[new Date(year, month, date).getDay()];
        })
        .html(`<p class="date">${ date }</p>`);
    }
    /**
     * 获取指定年配置的所有月份
     * @param {* number} year 当前年份
     * @param {* number} month 当前月份
     * @param {* number} mNum 月份选项卡数量
     */
    getCalMonth(year, month, mNum) {
      let mHtml = '';
      for (let i = 0; i < mNum; i++) {
        if (month + i > 11) { //
          year++;
          month = -i;
        }
        let m = month + 1 + i;
        mHtml += `<li data-year="${year}"  data-month="${m}" class="${ i===0 ? 'active' : '' }"><p class="month">${year}年${m }月</p>${ this.getMinPrice(year, m) }</li>`;
      }
      this.$calMonth.html(mHtml);
    }
    /**
     * 获取指定年月所有日期，以及部分上下月日期
     * @param {* number} year 当前年份
     * @param {* number} month 当前月份 
     * @param {* number} date 当前日期，默认值=1 
     */
    getCalDate(year, month, date) {
      let data = this.data;
      let now = new Date();
      let y = year;
      let m = month;
      let d = date ? date : now.getDate();
      let febDays = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) ? 29 : 28; //闰年二月份天数
      const monthDays = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const calGridNum = 42; //日历网格个数
      let nextMonthDate = 0; //下一个月的日期
      let startDate = new Date(y, m, 1).getDay(); //当月第一天
      let endDate = startDate + monthDays[m]; //当月最后一天
      // 初始化日期表格
      this.$calDate.html('');
      for (let i = 0; i < calGridNum; i++) {
        this.$calDate.append('<li></li>');
      }
      let $calDateItem = this.$calDate.children('li');
      $calDateItem.removeAttr('class');
      for (let i = 0; i < calGridNum; i++) {
        // 显示当月
        if (i >= startDate && i < endDate) {
          let curDate = i - (startDate - 1);
          // 日期插入网格中
          this.renderCalDate($calDateItem.eq(i), y, m, curDate);
          this.renderPlanData($calDateItem.eq(i), y, m, curDate);
          // 显示今天
          if (y === now.getFullYear() && m === now.getMonth() && d === curDate) {
            $calDateItem.eq(i).addClass('today')
              .children('.date').html('今天');
          }
        } else if (i < startDate) { // 显示上月
          let prevMonth = m === 0 ? 11 : (m - 1); // 跨年时，当m=0时, prevMonth=11;
          let prevYear = m === 0 ? (y - 1) : y; // 跨年时，当m=0时, prevYear=y-1;

          for (let j = monthDays[prevMonth]; j > monthDays[prevMonth] - startDate; j--) {
            if (i === monthDays[prevMonth] - j) {
              let curDate = monthDays[prevMonth] - ((startDate - 1) - i); // 获取当天日期
              $calDateItem.eq(i).addClass('invalid');
              // 日期插入网格中
              this.renderCalDate($calDateItem.eq(i), prevYear, prevMonth, curDate);
              // 输出对应日期的团期数据
              this.renderPlanData($calDateItem.eq(i), prevYear, prevMonth, curDate);
              break;
            }
          }
        } else {
          let nextMonth = m === 11 ? 0 : (m + 1);
          let nextYear = m === 11 ? (y + 1) : y;
          let curDate = ++nextMonthDate; // 获取当天日期

          $calDateItem.eq(i).addClass('invalid');
          // 日期插入网格中
          this.renderCalDate($calDateItem.eq(i), nextYear, nextMonth, curDate);
          // 输出对应日期的团期数据
          this.renderPlanData($calDateItem.eq(i), nextYear, nextMonth, curDate);
        }
      }
    }
    /**
     * 
     * @param {* object} obj dom 对象
     * @param {* function } callback 回调，参数：dateItem 已选日期项；dataIndex： 团期数据索引
     */
    selectCalDate(obj, callback) {

      let curDate = $(obj).attr('data-date');
      let $curMonthItem = this.$calMonth.children('li.active');
      let curMonth = ($curMonthItem.attr('data-month') - 1);
      let prevMonth = curMonth === 0 ? 11 : (curMonth - 1);
      let nextMonth = curMonth === 11 ? 0 : (curMonth + 1);

      $(obj).addClass('selected')
        .siblings().removeClass('selected');
      this.selectedDate = curDate;

      const curData = this.data.filter((curVal, i) => {
        if (curVal.date === curDate) {
          // 判断所选日期是否为当月、上月或下月
          if (new Date(curVal.date).getMonth() === nextMonth) {
            $curMonthItem.next().click();
          } else if (new Date(curVal.date).getMonth() === prevMonth) {
            $curMonthItem.prev().click();
          }
        }  
        return curVal.date === curDate;
      });
      // 初始化日期dom后重新获取已选日期
      let $selectedItem = this.$calDate.children('li.selected');

      if (typeof callback === 'function') {
        callback($selectedItem, curData);
      }
    }
  }
  return PlanCalendar;
});

