import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { safeUrl } from '../../utils/safeUrl';
import IconDisplay from '../IconDisplay';
import { inkOn, readableAccent } from '../../utils/templateInk';

export const CreativeTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites, sectionTitles, customIcons } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="flex min-h-full bg-white" style={bodyStyle}>
      <aside className="w-1/3 text-white p-8 flex flex-col items-center text-center" style={{ backgroundColor: themeColor, color: inkOn(themeColor) }}>
        {personalDetails.photo && (
          <div
            className="w-36 h-36 rounded-full mb-6 border-4 overflow-hidden flex items-center justify-center"
            style={{ borderColor: 'rgba(255,255,255,0.5)' }}
          >
            <img src={personalDetails.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        <InlineEdit 
            value={personalDetails.firstName} 
            fieldId="personalDetails.firstName" 
            onFocus={onFocus} 
            className="text-3xl font-bold block"
            style={titleStyle}
            tagName="h1"
            placeholder="First Name"
        />
        <InlineEdit 
            value={personalDetails.lastName} 
            fieldId="personalDetails.lastName" 
            onFocus={onFocus} 
            className="text-3xl font-bold block"
            style={titleStyle}
            tagName="h1"
            placeholder="Last Name"
        />
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg font-light mt-2 block"
            style={{ ...titleStyle, color: 'rgba(255,255,255,0.8)' }}
            tagName="p"
            placeholder="Job Title"
        />
        
        <hr className="w-1/2 my-8" style={{ borderColor: 'rgba(255,255,255,0.5)' }} />

        <section className="text-left w-full">
          <h2 className="text-lg font-semibold tracking-widest uppercase mb-4" style={titleStyle}>
            <InlineEdit value={sectionTitles?.contact || 'Contact'} fieldId="sectionTitles.contact" onFocus={onFocus} placeholder="Contact" />
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
                <IconDisplay iconName={customIcons?.email || 'mail'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            </div>
            <div className="flex items-center">
                <IconDisplay iconName={customIcons?.phone || 'phone'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            </div>
            <div className="flex items-center">
                <IconDisplay iconName={customIcons?.location || 'map-pin'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" />
                <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
            </div>
            {websites.map((site, index) => (
              <div key={site.id} className="flex items-center">
                  <IconDisplay iconName={site.icon || 'globe'} size={14} className="mr-3 flex-shrink-0 transform translate-y-px" />
                  <a href={safeUrl(site.url)} target="_blank" rel="noopener noreferrer" className="hover:text-primary-300 break-all">
                      <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                  </a>
              </div>
            ))}
          </div>
        </section>
        
        <hr className="w-full my-8" style={{ borderColor: 'rgba(255,255,255,0.5)' }} />

        <section className="text-left w-full">
            <h2 className="text-lg font-semibold tracking-widest uppercase mb-4" style={titleStyle}>
                <InlineEdit value={sectionTitles?.skills || 'Skills'} fieldId="sectionTitles.skills" onFocus={onFocus} placeholder="Skills" />
            </h2>
            <ul className="space-y-2">
                {skills.map((skill, index) => (
                <li key={skill.id} className="text-sm font-medium">
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                </li>
                ))}
            </ul>
        </section>
      </aside>

      <main className="w-2/3 p-10 text-gray-800">
        <section className="mb-8">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>
            <InlineEdit value={sectionTitles?.profile || 'Profile'} fieldId="sectionTitles.profile" onFocus={onFocus} placeholder="Profile" />
          </h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Professional Summary..."
          />
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-4" style={{...titleStyle, color: readableAccent(themeColor)}}>
            <InlineEdit value={sectionTitles?.experience || 'Experience'} fieldId="sectionTitles.experience" onFocus={onFocus} placeholder="Experience" />
          </h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-6">
              <div className="flex justify-between items-baseline">
                <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-bold block"
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                />
                <div className="flex gap-1 text-sm font-medium text-gray-600">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <div className="flex gap-1 text-md italic text-gray-600 mb-2">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <span>,</span>
                  <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm leading-relaxed whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-xl font-bold uppercase tracking-widest mb-4" style={{...titleStyle, color: readableAccent(themeColor)}}>
            <InlineEdit value={sectionTitles?.education || 'Education'} fieldId="sectionTitles.education" onFocus={onFocus} placeholder="Education" />
          </h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4">
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="font-bold text-lg block"
                style={titleStyle}
                tagName="h3"
                placeholder="Degree"
              />
              <InlineEdit 
                value={edu.school} 
                fieldId={`education[${index}].school`} 
                onFocus={onFocus} 
                className="text-md italic text-gray-600 block"
                tagName="p"
                placeholder="School"
              />
              <div className="flex gap-1 text-sm text-gray-600">
                  <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                  <span>-</span>
                  <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};