$(function() {
	
	var viewwidth = $('.tasklist-view').width();
	var listcount = $('.tasklist').length;
	var listpos;


	// send a request to flask, and optionally pass its response to a callback
	function do_request(method, data, callback) {
		$.post(webroot + '/_' + method, data, (callback !== undefined) ? callback : function(resp) {
			// obviously temporary default callback
			alert(resp);
		});
	}
	
	
	function refresh_view() {
		// show or hide nav buttons, change any other effects after list switch
		listpos = -parseInt($('.tasklists').css('left')) / viewwidth;
		$('.tasknav a').hide();
		if (listpos > 0) {
			$('.tasknav .prev').show();
		}
		if (listpos < listcount - 1) {
			$('.tasknav .next').show();
		}
	}
	

	$.fn.extend({
		// initializes an element to be editable
		make_editable: function() {
			$(this).editable({
				onEdit: function(content) {
					this.focus(); // this doesn't seem to work
				},
				onSubmit: function(content) {
					if (content.current != content.previous) {
						var data = {
							tasklist: this.closest('.tasklist').attr('id').slice(9),
						}

						if (this.hasClass('tasktitle')) {
							data['title'] = content.current;
							
						} else if (this.hasClass('tasknotes')) {
							data['notes'] = content.current;
						}
						
						var $task = this.closest('.task');
						
						if ($task.attr('id')) {
							// update an existing task (already has an id)
							data['task'] = $task.attr('id').slice(5);
							do_request('update_task', data);
						
						} else {
							// create a new task and assign it an id
							do_request('add_task', data, function(resp) {
								$task.attr('id', 'task-' + resp.id);
							});
							$task.find('input:checkbox').change(toggle_checkboxes);
						}
					}
				}
			}).keypress(function(e) {
				// trigger submit when user presses enter
				if (e.which == 13) {
					$(this).blur();
				}
			});
			
			return $(this);
		}
	});
	
	
	refresh_view();
	
	// animate horizontal paging between lists
	$('.tasknav a').click(false).click(function() {
		var oper = $(this).hasClass('next') ? '-=' : '+=';
		$('.tasklists').animate({left: oper + viewwidth + 'px'}, 250, refresh_view);
	});

	
	// edit task titles and notes
	$('.tasktitle, .tasknotes').make_editable();

	
	// reset check boxes in case of page reload
	$('.task.completed input:checkbox').prop('checked', true);
	$('.task:not(".completed") input:checkbox').prop('checked', false);
	
	
	// check boxes
	$('.task input:checkbox').change(toggle_checkboxes);
			
	function toggle_checkboxes(e) {
		submit_check_status($(this));
		
		// find out what other tasks' statuses are affected by this and submit them
		if ($(this).prop('checked')) {
			// if checking, also check all descendants
			$(this).closest('li').find('.task').addClass('completed').find('input:checkbox').not(':checked').each(function() {
					$(this).prop('checked', true);
					submit_check_status($(this));
				});
		
		} else {
			// if unchecking, also uncheck all ancestors and descendants (but not siblings)
			$(this).parents('.tasklist li').children('.task') // ancestors
				.add($(this).closest('li').find('.task')) // descendants
				.removeClass('completed').find('input:checkbox').filter(':checked').each(function() {
					$(this).prop('checked', false);
					submit_check_status($(this));
				})
		}
	}

	function submit_check_status($checkbox) {
		// submit the task status to the api
		var data = {
			tasklist: $checkbox.closest('.tasklist').attr('id').slice(9),
			task: $checkbox.closest('.task').attr('id').slice(5),
		}
		
		if ($checkbox.prop('checked')) {
			data['completed'] = new Date().toISOString();
			data['status'] = 'completed';
		} else {
			data['completed'] = null;
			data['status'] = 'needsAction';
		}
		
		do_request('update_task', data);
	}
	
	
	// add task
	$('.tasklist .add').click(function(e) {
		e.preventDefault();
		$(this).closest('.tasklist').children('ul').prepend(
			$('<li />').append(
				$('<div />').addClass('task').append(
					$('<input type="checkbox" />')
				).append(
					$('<a href="#" />').addClass('delete').text('X').click(delete_task)
				).append(
					$('<span />').addClass('tasktitle').make_editable().click()
				// i think we'll add a second button to add the notes instead
				//).append(
				//	$('<span />').addClass('tasknotes').make_editable()
				)
			)
		);
	});
	
	
	// delete task
	$('.task .delete').click(delete_task);
	
	
	function delete_task(e) {
		e.preventDefault();
		var data = {
			tasklist: $(this).closest('.tasklist').attr('id').slice(9),
			task: $(this).closest('.task').attr('id').slice(5),
		}
		$(this).closest('li').remove();
		
		do_request('delete_task', data);
	}
	
	
	// sort list
	$('.tasklists > .tasklist > ul').nestedSortable({
		listType: 'ul',
		items: 'li',
		toleranceElement: '> div',
		handle: '> div',
	}).bind('sortupdate', function(e, ui) {
		e.stopPropagation();
		
		var data = {
			tasklist: ui.item.closest('.tasklist').attr('id').slice(9),
			task: ui.item.children('.task').attr('id').slice(5),
		}
		
		// find the previous task at this level, if any
		if (ui.item.prev().children('.task').length) {
			data['previous'] = ui.item.prev().children('.task').attr('id').slice(5);
		}
		// find the parent task, if any
		if (ui.item.parents('.tasklist li').length) {
			data['parent'] = ui.item.parent().siblings('.task').attr('id').slice(5);
		}
		
		do_request('move_task', data);
	});
	
	
	/*
	// split list
	$('.task').hover(function() {
		$('<a class="split" />').appendTo(this).click(function() {
			
		}, false)
	}, function() {
		
	});
	*/
	
	
	
	
	
});
