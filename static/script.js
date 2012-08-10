$(function() {
	
	// scroll to the tasklist passed in the URL and given the 'start' class
	if ($('.tasklist.start').length) {
		var index = $('.tasklist.start').index('.tasklist');
		$('.tasklists').css('left', -index * $('.tasklist-view').width() + 'px');
	}
	
	refresh_view();
	
	// animate horizontal paging between lists
	$('.tasknav a').click(false).click(function() {
		var oper = $(this).hasClass('next') ? '-=' : '+=';
		$('.tasklists').animate({left: oper + $('.tasklist-view').width() + 'px'}, 250, refresh_view);
	});
	
	// edit task titles and notes
	$('.tltitle, .tasktitle, .tasknotes').each(function() {
		$(this).make_editable();
	});
	
	// check boxes
	$('.task .checkbox').click(toggle_checkboxes);

	// add task
	$('.tasklist .add').click(add_task);

	// delete task
	$('.task .delete').click(delete_task);
	
	// show/hide/create notes
	$('.task .notetoggle').click(toggle_notes);
	
	// split task into sublist
	$('.task .split').click(split_task);
	
	// sort list
	$('.tasklists > .tasklist > ul').nestedSortable({
		listType: 'ul',
		items: 'li',
		toleranceElement: '> div',
		handle: '> div',
	}).bind('sortupdate', update_sort_order);

});
	

function do_request(method, data, callback) {
	// send a request to flask, and optionally pass its response to a callback
	$.post(webroot + '/_' + method, data, (callback !== undefined) ? callback : function(resp) {
		// obviously temporary default callback
		alert(JSON.stringify(resp));
	});
}


function refresh_view() {
	// show or hide nav buttons, change any other effects after list switch
	listpos = -parseInt($('.tasklists').css('left')) / $('.tasklist-view').width();
	$('.tasknav a').hide();
	if (listpos > 0) {
		$('.tasknav .prev').show();
	}
	if (listpos < $('.tasklist').length - 1) {
		$('.tasknav .next').show();
	}
}


$.fn.extend({
	get_tasklist_id: get_tasklist_id,
	make_editable: make_editable
});


function get_tasklist_id() {
	// get id of parent tasklist
	var $tasklist = $(this).closest('.tasklist');
	
	if ($tasklist.hasClass('sublist')) {
		// class will be 'tasklist sublist-{id}'
		return $tasklist.attr('data-parent');
		
	} else {
		// id will be 'tasklist-{id}'
		return $tasklist.attr('id').slice(9);
	}
}


function make_editable() {
	// initializes an element to be editable
	$(this).keypress(function(e) {
		// trigger submit when user presses enter
		if (e.which == 13) {
			$(this).blur();
		}
	}).editable({
		type: $(this).hasClass('tasknotes') ? 'textarea' : 'text',
		onSubmit: function(content) {
			var data = {
				tasklist: this.get_tasklist_id(),
			};
			var $task = this.closest('.task');
			var taskid = $task.attr('id') ? $task.attr('id').slice(5) : null;
			
			var $sublist = this.closest('.sublist');
			var sublistid = $sublist.length ? $sublist.attr('id').slice(8) : null;

			// edit tasklist title

			if (this.hasClass('tltitle')) {
				if (content.current != content.previous) {
					data['title'] = content.current;
					if (sublistid) {
						// change the task title in the parent list
						$('#task-' + sublistid).children('.tasktitle').html(content.current);
						
						// update the sublist's task title
						data['task'] = sublistid;
						do_request('update_task', data)
						
					} else {
						// update the tasklist's title
						do_request('update_tasklist', data)
					}
				}
				
			// edit task title
			
			} else if (this.hasClass('tasktitle')) {
				if (content.current == '') {
					// remove entire task
					this.closest('li').remove();
					if (taskid) {
						data['task'] = taskid;
						do_request('delete_task', data);
					}

				} else if (content.current != content.previous) {
					data['title'] = content.current;

					if (taskid) {
						// update an existing task (already has an id)
						data['task'] = taskid;
						do_request('update_task', data);
					
					} else {
						if (this.closest('.sublist').length) {
							data['parent'] = this.closest('.sublist').attr('id').slice(8);
						}
						
						// create a new task and assign it an id
						do_request('add_task', data, function(resp) {
							$task.attr('id', 'task-' + resp.id);
							alert(JSON.stringify(resp));
						});
						$task.find('input:checkbox').change(toggle_checkboxes);
					}
				}
				
			// edit task notes

			} else if (this.hasClass('tasknotes')) {
				if (content.current == '') {
					// remove note html
					this.remove();
					$task.find('.notetoggle').html('+');
				}

				if (content.current != content.previous) {
					// update task with new notes (or lack thereof)
					data['task'] = taskid;
					data['notes'] = content.current;
					do_request('update_task', data);
				}
			}
		}
	});
	
	return $(this);
}


function toggle_checkboxes(e) {
	e.preventDefault();
	
	// find out what other tasks' statuses are affected by this and submit them
	
	// if it's currently unchecked
	if (!$(this).closest('li').children('.task').hasClass('completed')) {
		// check, and also check all descendants
		$(this).closest('li').find('.task').not('.completed')
			.addClass('completed').each(submit_check_status)
			.find('.checkbox').html('&#x2713;');
	
	// if it's currently checked
	} else {
		// uncheck, and uncheck all ancestors and descendants (but not siblings)
		$(this).closest('li').find('.checkbox').html('&nbsp;');
		$(this).parents('.tasklist li').children('.task.completed') // ancestors
			.add($(this).closest('li').find('.task.completed')) // descendants
			.removeClass('completed').each(submit_check_status)
			.find('.checkbox').html('&nbsp;');
	}
}


function submit_check_status() {
	// submit the task status to the api
	var data = {
		tasklist: $(this).get_tasklist_id(),
		task: $(this).attr('id').slice(5),
	};
	
	if ($(this).hasClass('completed')) {
		data['completed'] = new Date().toISOString();
		data['status'] = 'completed';
	} else {
		data['completed'] = null;
		data['status'] = 'needsAction';
	}
	
	do_request('update_task', data);
}


function add_task(e) {
	e.preventDefault();
	
	$(this).closest('.tasklist').children('ul').prepend(
		$('<li />').append(
			$('<div />').addClass('task').append(
				$('<a>&nbsp;</a>').addClass('checkbox')
			).append(
				$('<a href="#" />').addClass('delete control').html('&#xd7;').click(delete_task)
			).append(
				$('<a href="#" />').addClass('notetoggle control').html('+').click(toggle_notes)
			).append(
				$('<span />').addClass('tasktitle').make_editable().click()
			)
		)
	);
}


function delete_task(e) {
	e.preventDefault();
	var data = {
		tasklist: $(this).get_tasklist_id(),
		task: $(this).closest('.task').attr('id').slice(5),
	};
	$(this).closest('li').remove();
	
	do_request('delete_task', data);
}


function toggle_notes(e) {
	e.preventDefault();
	var $task = $(this).closest('.task');
	
	if (!$task.find('.tasknotes:visible').length) {
		if (!$task.find('.tasknotes').length) {
			// create notes
			$task.append($('<span />').addClass('tasknotes').make_editable().click());
		} else {
			// show notes
			$task.find('.tasknotes').slideDown(100);
		}
		$(this).html('&ndash;');
		
	} else {
		// hide notes
		$task.find('.tasknotes').slideUp(100);
		$(this).html('+');
	}
}


function split_task(e) {
	e.preventDefault();
	var $task = $(this).closest('.task');
	var $taskid = $task.attr('id').slice(5);
	var $tlid = $(this).get_tasklist_id();
	
	// create new sublist
	var $newlist = $('<div />').addClass('tasklist-view').append(
		$('<div />').addClass('upnav').append(
			$('<a href="#" />').html('&#x25b2;')
		)
	).append(
		$('<div />').addClass('tasklist sublist').attr('id', 'sublist-' + $taskid).attr('data-parent', $tlid).append(
			$('<div />').addClass('backg')
		).append(
			$('<a href="link" />').addClass('link').html('&para;')
		).append(
				$('<a href="#" />').addClass('add').html('&#xff0b;')
		).append(
			$('<h2 />').addClass('tltitle').html($task.children('.tasktitle').html()).make_editable()
		).append(
			$task.siblings('ul').clone(true, true)
		)
	).hide();
	
	// add a new listview below with a new list
	$task.closest('.tasklist-view').after($newlist);
	$newlist.slideDown();
	
	// hide the parent list (and all top-level lists), plus parent's nav and links
	$('.tasknav').fadeOut();
	$task.closest('.tasklist-view').children('.upnav').slideUp();
	$task.closest('.tasklist').children('a').fadeOut();
	$task.closest('.tasklist').children('ul').add('.tasklists .tasklist > ul').slideUp();
	
	// remove the original task tree when both animations are done
	$task.closest('.tasklist').children('ul').add($newlist).promise().done(function() {
		$task.siblings('ul').remove();
	});
	
	// bind upnav button to merge the sublist back into the parent
	$('.upnav a', $newlist).click(merge_task);
	
	// bind add and link buttons
	$('.add', $newlist).click(add_task);
	
	// add task notes and check status even when in sublist form
	
}


function merge_task(e) {
	e.preventDefault();
	
	var $sublist = $(this).parent().siblings('.sublist');
	var $task = $('#task-' + $sublist.attr('id').slice(8));
	
	$task.after($sublist.children('ul').clone(true, true));
	
	// hide this view
	$sublist.closest('.tasklist-view').slideUp();
	
	// show old view and all its extras
	$task.closest('.tasklist-view').children('.upnav').slideDown();
	$task.closest('.tasklist').children('a').fadeIn();
	$task.closest('.tasklist').children('ul').slideDown();
	
	// if parent task is top-level, then show top-level lists and fade in the nav
	if ($task.closest('.tasklists').length) {
		$('.tasklists .tasklist > ul').slideDown();
		$('.tasknav').fadeIn();
	}
	
	// remove the lowest task view when animations are done
	$sublist.closest('.tasklist-view').add(
		$task.closest('.tasklist').children('ul')
	).promise().done(function() {
		$sublist.closest('.tasklist-view').remove();
	});
}


function update_sort_order(e, ui) {
	e.stopPropagation();
	
	var data = {
		tasklist: ui.item.get_tasklist_id(),
		task: ui.item.children('.task').attr('id').slice(5),
	};
	
	// find the previous task at this level, if any
	if (ui.item.prev().children('.task').length) {
		data['previous'] = ui.item.prev().children('.task').attr('id').slice(5);
	}
	
	// find the parent task, if any
	if (ui.item.parents('.tasklist li').length) {
		data['parent'] = ui.item.parent().siblings('.task').attr('id').slice(5);
		
		// if unchecked, also uncheck all ancestors
		if (!ui.item.children('.task').find('input:checkbox').is(':checked')) {
			ui.item.parents('.tasklist li').children('.task')
				.removeClass('completed').find('input:checkbox').filter(':checked').each(function() {
					$(this).prop('checked', false);
					submit_check_status($(this));
				})
		}
	}
	
	do_request('move_task', data);
}

